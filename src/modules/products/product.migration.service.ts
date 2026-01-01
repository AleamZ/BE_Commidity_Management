import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Product, ProductDocument } from './product.entity';

@Injectable()
export class ProductMigrationService implements OnModuleInit {
    private readonly logger = new Logger(ProductMigrationService.name);

    constructor(
        @InjectModel(Product.name)
        private readonly productModel: Model<ProductDocument>,
    ) { }

    async onModuleInit() {
        await this.migrateBarcodeIndexes();
    }

    private async migrateBarcodeIndexes() {
        try {
            this.logger.log('Starting barcode index migration...');

            // Get existing indexes
            const indexes = await this.productModel.collection.listIndexes().toArray();
            this.logger.log(`Found ${indexes.length} existing indexes`);

            // Drop old problematic indexes if they exist
            const indexesToDrop = [
                'barcode_1', // Old simple barcode index
                'barcode_1_isDelete_1', // Old compound index without partial filter
                'name_1', // Remove unique constraint on name field - CRITICAL!
            ];

            for (const indexName of indexesToDrop) {
                try {
                    const indexExists = indexes.find(idx => idx.name === indexName);
                    if (indexExists) {
                        this.logger.log(`Found index ${indexName}, attempting to drop...`);
                        await this.productModel.collection.dropIndex(indexName);
                        this.logger.log(`✅ Successfully dropped old index: ${indexName}`);
                    } else {
                        this.logger.log(`Index ${indexName} not found, skipping...`);
                    }
                } catch (error) {
                    this.logger.error(`❌ Could not drop index ${indexName}: ${error.message}`);

                    // For name_1 index, this is critical - try alternative approach
                    if (indexName === 'name_1') {
                        try {
                            // Try dropping by index specification
                            await this.productModel.collection.dropIndex({ name: 1 } as any);
                            this.logger.log(`✅ Successfully dropped name index using index specification`);
                        } catch (altError) {
                            this.logger.error(`❌ Alternative drop also failed: ${altError.message}`);
                            throw new Error(`Critical: Cannot drop name unique index. Manual intervention required.`);
                        }
                    }
                }
            }

            // Create new partial unique index for active products only
            try {
                await this.productModel.collection.createIndex(
                    { barcode: 1, isDelete: 1 },
                    {
                        unique: true,
                        partialFilterExpression: { isDelete: false },
                        background: true,
                        name: 'barcode_active_unique'
                    }
                );
                this.logger.log('Created new partial unique index: barcode_active_unique');
            } catch (error) {
                if (error.message.includes('already exists')) {
                    this.logger.log('Partial unique index already exists, skipping creation');
                } else {
                    this.logger.error(`Error creating partial unique index: ${error.message}`);
                }
            }

            // Create performance indexes (non-unique)
            const performanceIndexes = [
                { key: { barcode: 1 } as any, name: 'barcode_1_new' },
                { key: { isDelete: 1 } as any, name: 'isDelete_1_new' },
                { key: { name: 1 } as any, name: 'name_1_non_unique' }, // Non-unique index for performance
            ];

            for (const indexConfig of performanceIndexes) {
                try {
                    await this.productModel.collection.createIndex(
                        indexConfig.key,
                        {
                            background: true,
                            name: indexConfig.name
                        }
                    );
                    this.logger.log(`Created performance index: ${indexConfig.name}`);
                } catch (error) {
                    if (error.message.includes('already exists')) {
                        this.logger.log(`Performance index ${indexConfig.name} already exists, skipping`);
                    } else {
                        this.logger.error(`Error creating performance index ${indexConfig.name}: ${error.message}`);
                    }
                }
            }

            // Verify the migration
            await this.verifyIndexes();

            this.logger.log('Barcode index migration completed successfully');
        } catch (error) {
            this.logger.error(`Barcode index migration failed: ${error.message}`);
            throw error;
        }
    }

    private async verifyIndexes() {
        try {
            const indexes = await this.productModel.collection.listIndexes().toArray();
            this.logger.log('Current indexes after migration:');

            indexes.forEach(index => {
                if (index.name.includes('barcode') || index.name.includes('isDelete')) {
                    this.logger.log(`- ${index.name}: ${JSON.stringify(index.key)}`);
                    if (index.unique) {
                        this.logger.log(`  Unique: true, Partial: ${index.partialFilterExpression ? 'yes' : 'no'}`);
                    }
                }
            });

            // Test duplicate barcode insertion and name allowance
            await this.testDuplicateBarcodeLogic();
            await this.testDuplicateNameLogic();
        } catch (error) {
            this.logger.error(`Index verification failed: ${error.message}`);
        }
    }

    private async testDuplicateBarcodeLogic() {
        try {
            this.logger.log('Testing duplicate barcode logic...');

            // Test: Should be able to create products with same barcode if one is deleted
            const testBarcode = 'TEST_MIGRATION_' + Date.now();

            // Create a test product
            const product1 = new this.productModel({
                name: 'Test Product 1',
                barcode: testBarcode,
                brandId: '507f1f77bcf86cd799439011', // Dummy ObjectId
                categoryId: '507f1f77bcf86cd799439011', // Dummy ObjectId
                isDelete: false
            });

            try {
                await product1.save();
                this.logger.log('✓ Created first test product');

                // "Delete" the first product
                await this.productModel.findByIdAndUpdate(product1._id, { isDelete: true });
                this.logger.log('✓ Soft deleted first test product');

                // Create another product with same barcode
                const product2 = new this.productModel({
                    name: 'Test Product 2',
                    barcode: testBarcode,
                    brandId: '507f1f77bcf86cd799439011', // Dummy ObjectId
                    categoryId: '507f1f77bcf86cd799439011', // Dummy ObjectId
                    isDelete: false
                });

                await product2.save();
                this.logger.log('✓ Created second test product with same barcode');

                // Clean up test data
                await this.productModel.deleteMany({
                    barcode: testBarcode
                });
                this.logger.log('✓ Cleaned up test data');

                this.logger.log('✅ Duplicate barcode logic test passed');
            } catch (error) {
                // Clean up any test data
                await this.productModel.deleteMany({
                    barcode: testBarcode
                });

                if (error.message.includes('duplicate key error')) {
                    this.logger.error('❌ Duplicate barcode logic test failed - index not working correctly');
                    throw new Error('Barcode index migration did not work correctly');
                } else {
                    this.logger.warn(`Test cleanup or other error: ${error.message}`);
                }
            }
        } catch (error) {
            this.logger.error(`Duplicate barcode test failed: ${error.message}`);
        }
    }

    private async testDuplicateNameLogic() {
        try {
            this.logger.log('Testing duplicate name logic...');

            // Test: Should be able to create products with same name but different barcodes
            const testName = 'Test Product Name';
            const testBarcode1 = 'NAME_TEST_' + Date.now() + '_1';
            const testBarcode2 = 'NAME_TEST_' + Date.now() + '_2';

            // Create first product
            const product1 = new this.productModel({
                name: testName,
                barcode: testBarcode1,
                brandId: '507f1f77bcf86cd799439011', // Dummy ObjectId
                categoryId: '507f1f77bcf86cd799439011', // Dummy ObjectId
                isDelete: false
            });

            try {
                await product1.save();
                this.logger.log('✓ Created first test product with name');

                // Create second product with same name but different barcode
                const product2 = new this.productModel({
                    name: testName, // Same name
                    barcode: testBarcode2, // Different barcode
                    brandId: '507f1f77bcf86cd799439011', // Dummy ObjectId
                    categoryId: '507f1f77bcf86cd799439011', // Dummy ObjectId
                    isDelete: false
                });

                await product2.save();
                this.logger.log('✓ Created second test product with same name but different barcode');

                // Clean up test data
                await this.productModel.deleteMany({
                    $or: [
                        { barcode: testBarcode1 },
                        { barcode: testBarcode2 }
                    ]
                });
                this.logger.log('✓ Cleaned up name test data');

                this.logger.log('✅ Duplicate name logic test passed - names can be duplicated');
            } catch (error) {
                // Clean up any test data
                await this.productModel.deleteMany({
                    $or: [
                        { barcode: testBarcode1 },
                        { barcode: testBarcode2 }
                    ]
                });

                if (error.message.includes('duplicate key error') && error.message.includes('name')) {
                    this.logger.error('❌ Duplicate name logic test failed - name still has unique constraint');
                    throw new Error('Name unique constraint was not removed correctly');
                } else {
                    this.logger.warn(`Name test cleanup or other error: ${error.message}`);
                }
            }
        } catch (error) {
            this.logger.error(`Duplicate name test failed: ${error.message}`);
        }
    }
} 