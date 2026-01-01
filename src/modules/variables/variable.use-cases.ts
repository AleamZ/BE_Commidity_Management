import { Injectable, NotFoundException } from '@nestjs/common';
import { VariableRepository } from './variable.repository';
import { CreateVariableDto } from './dtos/create.dto';
import { Variable } from './variable.entity';
import { UpdateVariableDto } from './dtos/update.dto';

@Injectable()
export class VariableUseCase {
  constructor(private readonly variableRepository: VariableRepository) { }

  async create(data: CreateVariableDto): Promise<Variable> {
    return await this.variableRepository.create(data);
  }

  async findById(id: string): Promise<Variable> {
    const variable = await this.variableRepository.findById(id);
    if (!variable) {
      throw new NotFoundException(`Biến thể không tồn tại với ID ${id}`);
    }
    return variable;
  }

  async update(id: string, data: UpdateVariableDto): Promise<Variable> {
    const variable = await this.variableRepository.update(id, data);
    if (!variable) {
      throw new NotFoundException(`Biến thể không tồn tại với ID ${id}`);
    }
    return variable;
  }

  async delete(id: string): Promise<void> {
    const variable = await this.variableRepository.findById(id);
    if (!variable) {
      throw new NotFoundException(`Biến thể không tồn tại với ID ${id}`);
    }

    // Toggle the isDelete status
    await this.variableRepository.softDelete(id, !variable.isDelete);
  }
}
