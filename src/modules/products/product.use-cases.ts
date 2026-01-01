import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ProductRepository } from './product.repository';
import { VariableRepository } from '../variables/variable.repository';
import { CreateProductDto } from './dtos/create.dto';
import { CreateVariableDto } from '../variables/dtos/create.dto';
import { Product, ProductDocument } from './product.entity'; // Ensure ProductDocument is imported
import { UpdateProductDto } from './dtos/update.dto';
import { BaseQueryDto } from 'src/common/dtos/base-query.dto';
import { DeleteListProductDto } from './dtos/delete-list.dto';
import { Types } from 'mongoose'; // Import Types
import { VariableDocument } from '../variables/variable.entity'; // Import VariableDocument
import { ActivityLogService } from '../ActivityLog/activityLog.service';
import { BarcodeGeneratorService } from './barcode-generator.service';

@Injectable()
export class ProductUseCase {
  constructor(
    private readonly variableRepository: VariableRepository,
    private readonly productRepository: ProductRepository,
    private readonly activityLogService: ActivityLogService,
    private readonly barcodeGeneratorService: BarcodeGeneratorService,
  ) { }

  async create(data: CreateProductDto, userId: string): Promise<Product> {
    const {
      name,
      description,
      variablesProduct,
      brandId,
      categoryId,
      isSerial,
      listImage,
      mainImage,
      stock, // This is for the main product if not variable
      serials, // This is for the main product if not variable
      isVariable,
      barcode,
    } = data;

    // Validate barcode format
    if (!this.barcodeGeneratorService.validateBarcodeFormat(barcode)) {
      throw new BadRequestException(
        `Mã sản phẩm "${barcode}" không hợp lệ. Mã sản phẩm không được để trống.`
      );
    }

    // Check if barcode already exists
    const exitProduct = await this.productRepository.findByProductByBarCode(
      String(barcode),
    );
    if (exitProduct) {
      // Suggest alternatives
      const suggestions = await this.barcodeGeneratorService.suggestAlternativeBarcodes(
        barcode,
        3
      );
      const suggestionText = suggestions.length > 0
        ? ` Gợi ý mã khác: ${suggestions.join(', ')}`
        : '';

      throw new BadRequestException(
        `Mã sản phẩm "${barcode}" đã được sử dụng cho sản phẩm "${exitProduct.name}". Vui lòng chọn mã khác.${suggestionText}`
      );
    }
    if (isVariable) {
      if (!variablesProduct?.length) {
        // This line throws the error if variablesProduct is undefined or empty
        throw new BadRequestException(
          'Sản phẩm có biến thể phải có ít nhất một biến thể. Vui lòng thêm biến thể cho sản phẩm.',
        );
      }

      const variableIds: string[] = [];
      let finalAggregatedCostPrice = 0;
      let finalAggregatedSellPrice = 0;
      let finalAggregatedStock = 0;
      let finalMainImage = mainImage; // Use product's mainImage as default
      let finalListImage = listImage; // Use product's listImage as default

      // Process each variable
      const createVariables = await Promise.all(
        variablesProduct.map(async (variable: CreateVariableDto) => {
          if (
            typeof variable.costPrice !== 'number' ||
            typeof variable.sellPrice !== 'number'
          ) {
            const attributeStr = variable.attribute.map(attr => `${attr.key}: ${attr.value}`).join(', ');
            throw new BadRequestException(
              `Giá vốn và giá bán là bắt buộc cho biến thể "${attributeStr}". Vui lòng nhập đầy đủ thông tin giá.`,
            );
          }
          if (
            variable.isSerial &&
            (!variable.serials || variable.serials.length === 0)
          ) {
            const attributeStr = variable.attribute.map(attr => `${attr.key}: ${attr.value}`).join(', ');
            throw new BadRequestException(
              `Serial là bắt buộc cho biến thể "${attributeStr}" khi quản lý theo serial. Vui lòng thêm danh sách serial.`,
            );
          }
          if (
            variable.isSerial &&
            variable.serials &&
            variable.serials.length !== variable.stock
          ) {
            const attributeStr = variable.attribute.map(attr => `${attr.key}: ${attr.value}`).join(', ');
            throw new BadRequestException(
              `Số lượng serial (${variable.serials.length}) phải bằng với số lượng tồn kho (${variable.stock}) cho biến thể "${attributeStr}". Vui lòng kiểm tra lại.`,
            );
          }

          const createdVariable = await this.variableRepository.create({
            ...variable,
            isSerial: variable.isSerial || false,
            serials: variable.serials || [],
          });
          return createdVariable;
        }),
      );

      variableIds.push(
        ...createVariables.map((variable) => String(variable._id)),
      );

      if (createVariables.length > 0) {
        const totalCost = createVariables.reduce(
          (sum, v) => sum + v.costPrice,
          0,
        );
        const totalSell = createVariables.reduce(
          (sum, v) => sum + v.sellPrice,
          0,
        );
        finalAggregatedCostPrice = totalCost / createVariables.length;
        finalAggregatedSellPrice = totalSell / createVariables.length;
        finalAggregatedStock = createVariables.reduce(
          (sum, v) => sum + (v.stock || 0),
          0,
        );

        const firstInStockVariableWithImage = createVariables.find(
          (v) => v.stock > 0 && v.mainImage,
        );
        if (firstInStockVariableWithImage) {
          finalMainImage = firstInStockVariableWithImage.mainImage;
          finalListImage = firstInStockVariableWithImage.listImage || [];
        } else {
          // Fallback if no variable has image, or use product level if provided
          finalMainImage = mainImage || createVariables[0]?.mainImage || '';
          finalListImage = listImage || createVariables[0]?.listImage || [];
        }
      }
      await this.activityLogService.logActivity({
        userId: userId,
        action: 'CREATE_PRODUCT',
        message: `Tạo sản phẩm ${name}`,
        refId: '',
        refType: 'Product',
        metadata: {
          total: 1,
          productCount: 1,
        },
      });
      return await this.productRepository.create({
        name,
        description,
        costPrice: finalAggregatedCostPrice,
        sellPrice: finalAggregatedSellPrice,
        brandId,
        categoryId,
        isSerial: false, // Product itself is not serial-tracked at top level if it has variables
        listImage: finalListImage,
        mainImage: finalMainImage,
        stock: finalAggregatedStock,
        serials: [], // Product serials are empty if it has variables
        variables: variableIds,
        isVariable: true,
        barcode: barcode,
      });
    }
    // Case without variables (Case 3 and Case 4: Simple Product)
    else {
      // Validate costPrice for non-variable products (it should be provided)
      // The DTO should ideally make costPrice non-optional for this case,
      // but we add a robust check here.
      if (typeof data.costPrice !== 'number') {
        // Check if costPrice from the original data DTO is a number
        throw new BadRequestException(
          'Giá vốn là bắt buộc và phải là số. Vui lòng nhập giá vốn hợp lệ.',
        );
      }
      if (typeof data.sellPrice !== 'number') {
        throw new BadRequestException(
          'Giá bán là bắt buộc và phải là số. Vui lòng nhập giá bán hợp lệ.',
        );
      }
      if (typeof data.stock !== 'number') {
        throw new BadRequestException(
          'Số lượng tồn kho là bắt buộc và phải là số. Vui lòng nhập số lượng hợp lệ.',
        );
      }

      // Validate serials for Case 4 (non-variable product with serials)
      if (isSerial === true) {
        // Explicitly check for true
        if (!serials || serials.length === 0) {
          throw new BadRequestException(
            'Serial là bắt buộc cho sản phẩm quản lý theo serial. Vui lòng thêm danh sách serial.',
          );
        }
        // Ensure stock is defined and is a number for this check
        if (typeof stock !== 'number') {
          throw new BadRequestException(
            'Số lượng tồn kho phải là số khi sản phẩm quản lý theo serial.',
          );
        }
        if (serials.length !== stock) {
          throw new BadRequestException(
            `Số lượng serial (${serials.length}) phải bằng với số lượng tồn kho (${stock}). Vui lòng kiểm tra lại.`,
          );
        }
      } else {
        // If not isSerial, serials array should be empty
        if (serials && serials.length > 0) {
          throw new BadRequestException(
            'Serial phải để trống cho sản phẩm không quản lý theo serial.',
          );
        }
      }
      await this.activityLogService.logActivity({
        userId: userId,
        action: 'CREATE_PRODUCT',
        message: `Tạo sản phẩm ${name}`,
        refId: '',
        refType: 'Product',
        metadata: {
          total: 1,
          productCount: 1,
        },
      });
      return await this.productRepository.create({
        name,
        description,
        costPrice: data.costPrice, // Use costPrice from original data DTO
        sellPrice: data.sellPrice,
        brandId,
        categoryId,
        isSerial: isSerial || false, // Default to false if not provided
        listImage,
        mainImage,
        stock: data.stock,
        serials: isSerial ? serials || [] : [], // Ensure serials is empty if not isSerial
        variables: [],
        isVariable: false,
        barcode: barcode,
      });
    }
  }

  async update(
    id: string,
    data: UpdateProductDto,
    userId: string,
  ): Promise<Product | null> {
    const existingProduct = await this.productRepository.findProductById(id);
    if (!existingProduct) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    // Check for barcode conflict if barcode is being updated
    if (data.barcode && data.barcode !== existingProduct.barcode) {
      // Validate format
      if (!this.barcodeGeneratorService.validateBarcodeFormat(data.barcode)) {
        throw new BadRequestException(
          `Mã sản phẩm "${data.barcode}" không hợp lệ. Mã sản phẩm không được để trống.`
        );
      }

      // Check for conflicts
      const existingProductWithBarcode = await this.productRepository.findByProductByBarCodeExcludingId(
        String(data.barcode),
        id
      );
      if (existingProductWithBarcode) {
        const suggestions = await this.barcodeGeneratorService.suggestAlternativeBarcodes(
          data.barcode,
          3
        );
        const suggestionText = suggestions.length > 0
          ? ` Gợi ý mã khác: ${suggestions.join(', ')}`
          : '';

        throw new BadRequestException(
          `Mã sản phẩm "${data.barcode}" đã được sử dụng cho sản phẩm "${existingProductWithBarcode.name}". Vui lòng chọn mã khác.${suggestionText}`
        );
      }
    }

    const updatePayload: Partial<ProductDocument> = {};

    // Directly map simple fields if provided in DTO
    const simpleFields: (keyof UpdateProductDto)[] = [
      'name',
      'description',
      'barcode',
      'brandId',
      'categoryId',
      'mainImage',
      'listImage',
    ];
    simpleFields.forEach((field) => {
      if (data[field] !== undefined) {
        (updatePayload as any)[field] = data[field];
      }
    });

    const isVariableBeingSet = data.isVariable !== undefined;
    const currentIsVariable = isVariableBeingSet
      ? data.isVariable
      : existingProduct.isVariable;

    if (currentIsVariable) {
      updatePayload.isVariable = true;
      updatePayload.isSerial = false; // Main product is not serial if it has variables
      updatePayload.serials = []; // Main product serials are empty

      if (data.variablesProduct && data.variablesProduct.length > 0) {
        const variableIds: string[] = [];
        const processedVariables: VariableDocument[] = await Promise.all(
          // Explicitly type here
          data.variablesProduct.map(
            async (
              variableData: Partial<CreateVariableDto & { _id?: string }>,
            ) => {
              // Type variableData more specifically
              if (
                typeof variableData.costPrice !== 'number' ||
                typeof variableData.sellPrice !== 'number'
              ) {
                throw new BadRequestException(
                  `Cost price and sell price are required for each variable. Attribute: ${JSON.stringify(variableData.attribute)}`,
                );
              }
              if (
                variableData.isSerial &&
                (!variableData.serials || variableData.serials.length === 0)
              ) {
                throw new BadRequestException(
                  `Serials are required for variable with attribute: ${JSON.stringify(variableData.attribute)} when isSerial is true`,
                );
              }
              if (
                variableData.isSerial &&
                variableData.serials &&
                variableData.serials.length !== variableData.stock
              ) {
                throw new BadRequestException(
                  `Number of serials (${variableData.serials.length}) must match stock (${variableData.stock}) for variable: ${JSON.stringify(variableData.attribute)}`,
                );
              }

              if (variableData._id) {
                const updatedVar = await this.variableRepository.update(
                  variableData._id,
                  {
                    ...variableData,
                    isSerial: variableData.isSerial || false,
                    serials: variableData.serials || [],
                  },
                );
                if (!updatedVar)
                  throw new NotFoundException(
                    `Variable with ID ${variableData._id} not found during update.`,
                  );
                return updatedVar as VariableDocument; // Cast to VariableDocument
              } else {
                // Ensure all required fields for CreateVariableDto are present if creating new
                const newVarData: CreateVariableDto = {
                  attribute: variableData.attribute!, // Assuming attribute is always present for new
                  costPrice: variableData.costPrice,
                  sellPrice: variableData.sellPrice,
                  stock: variableData.stock || 0,
                  description: variableData.description || '', // Add default or ensure it's in DTO
                  isSerial: variableData.isSerial || false,
                  serials: variableData.serials || [],
                  mainImage: variableData.mainImage,
                  listImage: variableData.listImage,
                  // isDelete is usually not set on create, defaults to false in schema
                };
                return (await this.variableRepository.create(
                  newVarData,
                )) as VariableDocument; // Cast to VariableDocument
              }
            },
          ),
        );

        // Ensure 'v' is treated as VariableDocument here, apply forceful cast for _id
        variableIds.push(
          ...processedVariables.map((v: VariableDocument) =>
            ((v as any)._id as Types.ObjectId).toString(),
          ),
        );
        updatePayload.variables = variableIds as any[]; // Mongoose expects ObjectId[]

        // Recalculate aggregated fields
        if (processedVariables.length > 0) {
          const totalCost = processedVariables.reduce(
            (sum, v) => sum + v.costPrice,
            0,
          );
          const totalSell = processedVariables.reduce(
            (sum, v) => sum + v.sellPrice,
            0,
          );
          updatePayload.costPrice = totalCost / processedVariables.length;
          updatePayload.sellPrice = totalSell / processedVariables.length;
          updatePayload.stock = processedVariables.reduce(
            (sum, v) => sum + (v.stock || 0),
            0,
          );

          // Update main/list image based on variables only if not explicitly set in DTO
          if (data.mainImage === undefined || data.listImage === undefined) {
            const firstInStockVarWithImage = processedVariables.find(
              (v) => v.stock > 0 && v.mainImage,
            );
            if (firstInStockVarWithImage) {
              if (data.mainImage === undefined)
                updatePayload.mainImage = firstInStockVarWithImage.mainImage;
              if (data.listImage === undefined)
                updatePayload.listImage =
                  firstInStockVarWithImage.listImage || [];
            } else if (processedVariables[0]) {
              if (data.mainImage === undefined)
                updatePayload.mainImage =
                  processedVariables[0].mainImage || existingProduct.mainImage;
              if (data.listImage === undefined)
                updatePayload.listImage =
                  processedVariables[0].listImage || existingProduct.listImage;
            }
          }
        }
      } else if (
        isVariableBeingSet &&
        data.isVariable === true &&
        (!data.variablesProduct || data.variablesProduct.length === 0)
      ) {
        if (!existingProduct.isVariable && data.isVariable === true) {
          throw new BadRequestException(
            'Variable products are required when transitioning to a variable product.',
          );
        }

        if (existingProduct.isVariable) {
          updatePayload.variables = existingProduct.variables; // Keep existing
          updatePayload.costPrice = existingProduct.costPrice;
          updatePayload.sellPrice = existingProduct.sellPrice;
          updatePayload.stock = existingProduct.stock;
        }
      }
      if (!data.variablesProduct && existingProduct.isVariable) {
        updatePayload.variables = existingProduct.variables;
        if (data.costPrice === undefined)
          updatePayload.costPrice = existingProduct.costPrice;
        if (data.sellPrice === undefined)
          updatePayload.sellPrice = existingProduct.sellPrice;
        if (data.stock === undefined)
          updatePayload.stock = existingProduct.stock;
      }
    } else {
      updatePayload.isVariable = false;
      updatePayload.variables = [];

      if (data.costPrice !== undefined)
        updatePayload.costPrice = data.costPrice;
      else if (isVariableBeingSet)
        throw new BadRequestException(
          'Cost Price is required for non-variable products.',
        );

      if (data.sellPrice !== undefined)
        updatePayload.sellPrice = data.sellPrice;
      else if (isVariableBeingSet)
        throw new BadRequestException(
          'Sell Price is required for non-variable products.',
        );

      if (data.stock !== undefined) updatePayload.stock = data.stock;
      else if (isVariableBeingSet)
        throw new BadRequestException(
          'Stock is required for non-variable products.',
        );

      const productIsSerial =
        data.isSerial !== undefined ? data.isSerial : existingProduct.isSerial;
      if (data.isSerial !== undefined) updatePayload.isSerial = data.isSerial;

      if (productIsSerial) {
        if (data.serials !== undefined) {
          if (
            data.serials.length !==
            (updatePayload.stock ?? existingProduct.stock)
          ) {
            throw new BadRequestException(
              `Number of serials must match stock for non-variable serial product.`,
            );
          }
          updatePayload.serials = data.serials;
        } else if (data.isSerial === true) {
          // isSerial is true, but serials not provided
          throw new BadRequestException(
            'Serials are required when isSerial is true for a non-variable product.',
          );
        }
      } else {
        updatePayload.serials = [];
      }
    }

    if (Object.keys(updatePayload).length === 0) {
      return existingProduct;
    }
    await this.activityLogService.logActivity({
      userId: userId,
      action: 'UPDATE_PRODUCT',
      message: `Cập nhật sản phẩm ${existingProduct.name}`,
      refId: id,
      refType: 'Product',
      metadata: {
        total: 1,
        productCount: 1,
      },
    });
    return await this.productRepository.update(id, updatePayload);
  }

  async actionProductSoft(id: string, userId: string): Promise<void> {
    const product = await this.productRepository.findProductById(id);
    if (!product) {
      throw new NotFoundException(`Record not found ${id}`);
    }
    await this.activityLogService.logActivity({
      userId: userId,
      action: 'DELETE_PRODUCT',
      message: `Xóa sản phẩm ${product.name}`,
      refId: id,
      refType: 'Product',
      metadata: {
        total: 1,
        productCount: 1,
      },
    });
    await this.productRepository.productSoft(id, !product.isDelete);
  }

  async actionSoftDeleteListProducts(
    dto: DeleteListProductDto,
    userId: string,
  ): Promise<void> {
    const { ids } = dto;

    const products = await this.productRepository.checkProductInListProducts(
      ids as string[],
    );

    if (products.length !== ids.length) {
      const foundIds = products.map((p) =>
        ((p as any)._id as Types.ObjectId).toString(),
      );
      const notFoundIds = (ids as string[]).filter(
        (id) => !foundIds.includes(id),
      );
      throw new NotFoundException(
        `Một vài sản phẩm không tìm thấy: ${notFoundIds.join(', ')}`,
      );
    }

    const productNames = products.map((p) => p.name).join(', ');

    await this.activityLogService.logActivity({
      userId: userId,
      action: 'DELETE_PRODUCT',
      message: `Xóa các sản phẩm: ${productNames}`,
      refId: '',
      refType: 'Product',
      metadata: {
        total: 1,
        productCount: ids.length ?? 1,
      },
    });

    await this.productRepository.productsSoftDelete(ids);
  }

  async getList(query: BaseQueryDto) {
    const products = await this.productRepository.find(query);
    const attrs = await this.productRepository.count(query);
    return {
      products,
      attrs,
    };
  }

  async getProductDetail(id: string) {
    // Fetch product without populated variables initially
    const product = await this.productRepository.findProductById(id);

    if (!product) {
      throw new NotFoundException(`Product not found with id ${id}`);
    }

    // If product has variables (array of IDs), fetch each one using VariableUseCase
    if (product.variables && product.variables.length > 0) {
      const populatedVariables = await Promise.all(
        product.variables.map(async (variableId) => {
          try {
            // Assuming variableId is an ObjectId, convert to string if necessary for the use case
            return await this.variableRepository.findById(
              variableId.toString(),
            );
          } catch (error) {
            // Handle cases where a variable might not be found or an error occurs
            console.error(
              `Error fetching variable with ID ${variableId}:`,
              error,
            );
            return null; // Or some other error indicator
          }
        }),
      );
      // Filter out any nulls if variables weren't found
      product.variables = populatedVariables.filter((v) => v !== null) as any;
    }

    return product;
  }

  async getSerials(payload: { productId: string; variableId?: string }) {
    const { productId, variableId } = payload;
    const product = await this.productRepository.findProductById(productId);
    if (!product) {
      throw new NotFoundException('Product not found');
    }
    if (product.serials && product.serials.length > 0) {
      return product.serials;
    }
    if (product.isVariable && variableId) {
      const variable = await this.variableRepository.findById(variableId);
      if (!variable) {
        throw new NotFoundException('Variable not found');
      }
      return variable.serials || [];
    }
    return [];
  }

  async getVariables(id: string) {
    const product = await this.productRepository.findProductById(id);
    if (!product) {
      throw new NotFoundException('Product not found');
    }
    if (product.variables.length) {
      const variableData = await Promise.all(
        product.variables.map(async (variableId) => {
          const variable = await this.variableRepository.findById(
            variableId.toString(),
          );
          if (!variable) return null;
          return variable;
        }),
      );

      return variableData.filter((v) => v !== null);
    }
    return [];
  }
}
