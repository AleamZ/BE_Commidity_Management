import { InjectModel } from '@nestjs/mongoose';
import { User, UserDocument } from '../user.entity';
import { Model } from 'mongoose';
import { RegisterDTO } from '../dtos/register.dto';
import { UserRole } from 'src/common/enums/role';
import { UpdateProfileDto } from '../dtos/update-profile.dto';

export class UserRepository {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
  ) { }

  async createUser(data: RegisterDTO): Promise<UserDocument> {
    const createdUser = new this.userModel(data);
    return createdUser.save();
  }

  async checkEmail(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email }).exec();
  }
  async updateRefreshToken(userId: string, hashedToken: string): Promise<void> {
    await this.userModel.findByIdAndUpdate(userId, {
      refreshToken: hashedToken,
    });
  }
  async removeRefreshToken(userId: string): Promise<void> {
    await this.userModel.findByIdAndUpdate(userId, {
      refreshToken: null,
    });
  }
  async findUserById(userId: string): Promise<UserDocument | null> {
    return await this.userModel.findById(userId);
  }

  async findStaff(): Promise<UserDocument[]> {
    return this.userModel.find({ role: UserRole.STAFF }).exec();
  }

  async deleteStaffById(id: string): Promise<void> {
    await this.userModel.deleteOne({ _id: id, role: UserRole.STAFF }).exec();
  }

  async findStaffById(id: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ _id: id, role: UserRole.STAFF }).exec();
  }

  async updateStaffById(
    id: string,
    updateData: Partial<User>,
  ): Promise<UserDocument | null> {
    return this.userModel
      .findOneAndUpdate({ _id: id, role: UserRole.STAFF }, updateData, {
        new: true,
      })
      .exec();
  }

  // New methods for account settings
  async updateProfile(userId: string, updateData: UpdateProfileDto): Promise<UserDocument | null> {
    return this.userModel
      .findByIdAndUpdate(userId, updateData, { new: true })
      .select('-password -refreshToken')
      .exec();
  }

  async updatePassword(userId: string, hashedPassword: string): Promise<UserDocument | null> {
    return this.userModel
      .findByIdAndUpdate(userId, { password: hashedPassword }, { new: true })
      .select('-password -refreshToken')
      .exec();
  }

  async checkEmailExists(email: string, excludeUserId?: string): Promise<boolean> {
    const query: any = { email };
    if (excludeUserId) {
      query._id = { $ne: excludeUserId };
    }
    const user = await this.userModel.findOne(query).exec();
    return !!user;
  }
}
