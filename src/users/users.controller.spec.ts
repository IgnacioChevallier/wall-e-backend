import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { NotFoundException } from '@nestjs/common';
import { UpdateUserDto } from './dto/update-user.dto';

describe('UsersController', () => {
  let controller: UsersController;
  let service: UsersService;

  const mockUsersService = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  const mockUser = {
    id: 'user-id',
    email: 'test@example.com',
    password: 'hashed-password',
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
      ],
    }).compile();

    controller = module.get<UsersController>(UsersController);
    service = module.get<UsersService>(UsersService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should return an array of users', async () => {
      const mockUsers = [
        mockUser,
        { ...mockUser, id: 'user-id-2', email: 'test2@example.com' },
      ];
      mockUsersService.findAll.mockResolvedValue(mockUsers);

      const result = await controller.findAll();

      expect(result).toEqual(mockUsers);
      expect(mockUsersService.findAll).toHaveBeenCalled();
    });

    it('should handle errors from usersService.findAll', async () => {
      mockUsersService.findAll.mockRejectedValue(new Error('Database error'));

      await expect(controller.findAll()).rejects.toThrow('Database error');
      expect(mockUsersService.findAll).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return a user when found', async () => {
      const userId = 'user-id';
      mockUsersService.findOne.mockResolvedValue(mockUser);

      const result = await controller.findOne(userId);

      expect(result).toEqual(mockUser);
      expect(mockUsersService.findOne).toHaveBeenCalledWith(userId);
    });

    it('should handle NotFoundException from usersService.findOne', async () => {
      const userId = 'non-existent-id';
      mockUsersService.findOne.mockRejectedValue(
        new NotFoundException(`User with ID ${userId} not found`),
      );

      await expect(controller.findOne(userId)).rejects.toThrow(
        new NotFoundException(`User with ID ${userId} not found`),
      );
      expect(mockUsersService.findOne).toHaveBeenCalledWith(userId);
    });

    it('should handle other errors from usersService.findOne', async () => {
      const userId = 'user-id';
      mockUsersService.findOne.mockRejectedValue(new Error('Database error'));

      await expect(controller.findOne(userId)).rejects.toThrow(
        'Database error',
      );
      expect(mockUsersService.findOne).toHaveBeenCalledWith(userId);
    });
  });

  describe('update', () => {
    it('should update and return a user', async () => {
      const userId = 'user-id';
      const updateDto: UpdateUserDto = {
        email: 'updated@example.com',
        password: 'newPassword12345',
      };
      const updatedUser = { ...mockUser, ...updateDto };

      mockUsersService.update.mockResolvedValue(updatedUser);

      const result = await controller.update(userId, updateDto);

      expect(result).toEqual(updatedUser);
      expect(mockUsersService.update).toHaveBeenCalledWith(userId, updateDto);
    });

    it('should handle errors from usersService.update', async () => {
      const userId = 'user-id';
      const updateDto: UpdateUserDto = {
        email: 'updated@example.com',
        password: 'newPassword12345',
      };

      mockUsersService.update.mockRejectedValue(new Error('Update failed'));

      await expect(controller.update(userId, updateDto)).rejects.toThrow(
        'Update failed',
      );
      expect(mockUsersService.update).toHaveBeenCalledWith(userId, updateDto);
    });
  });

  describe('remove', () => {
    it('should delete and return a user', async () => {
      const userId = 'user-id';
      mockUsersService.remove.mockResolvedValue(mockUser);

      const result = await controller.remove(userId);

      expect(result).toEqual(mockUser);
      expect(mockUsersService.remove).toHaveBeenCalledWith(userId);
    });

    it('should handle errors from usersService.remove', async () => {
      const userId = 'user-id';
      mockUsersService.remove.mockRejectedValue(new Error('Delete failed'));

      await expect(controller.remove(userId)).rejects.toThrow('Delete failed');
      expect(mockUsersService.remove).toHaveBeenCalledWith(userId);
    });
  });
});
