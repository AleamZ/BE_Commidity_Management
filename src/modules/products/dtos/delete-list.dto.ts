import { IsArray, IsMongoId, ArrayNotEmpty } from 'class-validator';
import { Types } from 'mongoose';

export class DeleteListProductDto {
    @IsArray()
    @ArrayNotEmpty()
    @IsMongoId({ each: true, message: 'Mỗi ID trong danh sách phải là một MongoID hợp lệ.' })
    ids: string[] | Types.ObjectId[];
}
