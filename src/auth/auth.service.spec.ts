import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt');

describe('AuthService', () => {
  let service: AuthService;
  let usersService: UsersService;
  let jwtService: JwtService;

  const mockUsersService = {
    findByEmail: jest.fn(),
    findByAlias: jest.fn(),
    create: jest.fn(),
  };

  const mockJwtService = {
    sign: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    usersService = module.get<UsersService>(UsersService);
    jwtService = module.get<JwtService>(JwtService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('register', () => {
    const registerDto = {
      email: 'test@example.com',
      password: 'password123',
      alias: 'testuser',
    };

    const hashedPassword = 'hashed-password';

    const mockCreatedUser = {
      id: 'user-id',
      email: registerDto.email,
      password: hashedPassword,
      alias: registerDto.alias,
      createdAt: new Date(),
      updatedAt: new Date(),
      wallet: {
        id: 'wallet-id',
        balance: 0,
        userId: 'user-id',
      },
    };

    beforeEach(() => {
      (bcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword);
      mockUsersService.create.mockResolvedValue(mockCreatedUser);
      mockJwtService.sign.mockReturnValue('jwt-token');
    });

    it('should register a new user successfully', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);
      mockUsersService.findByAlias.mockResolvedValue(null);

      const result = await service.register(registerDto);

      expect(bcrypt.hash).toHaveBeenCalledWith(registerDto.password, 10);
      expect(mockUsersService.findByEmail).toHaveBeenCalledWith(
        registerDto.email,
      );
      expect(mockUsersService.create).toHaveBeenCalledWith({
        email: registerDto.email,
        password: hashedPassword,
        alias: registerDto.alias,
      });
      expect(mockJwtService.sign).toHaveBeenCalledWith({
        email: mockCreatedUser.email,
        userId: mockCreatedUser.id,
      });
      expect(result.accessToken).toEqual('jwt-token');
      expect(result.user).toBeDefined();

      expect(result.user).not.toHaveProperty('password');
    });

    it('should throw ConflictException if email is already in use', async () => {
      mockUsersService.findByEmail.mockResolvedValue(mockCreatedUser);

      await expect(service.register(registerDto)).rejects.toThrow(
        new ConflictException('Email already exists'),
      );

      expect(mockUsersService.findByEmail).toHaveBeenCalledWith(
        registerDto.email,
      );
      expect(mockUsersService.create).not.toHaveBeenCalled();
    });

    it('should throw ConflictException if alias is already in use', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);
      mockUsersService.findByAlias.mockResolvedValue(mockCreatedUser);

      await expect(service.register(registerDto)).rejects.toThrow(
        new ConflictException('Alias already exists'),
      );

      expect(mockUsersService.findByEmail).toHaveBeenCalledWith(
        registerDto.email,
      );
      expect(mockUsersService.findByAlias).toHaveBeenCalledWith(
        registerDto.alias,
      );
      expect(mockUsersService.create).not.toHaveBeenCalled();
    });

    it('should handle bcrypt hash failure', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);
      mockUsersService.findByAlias.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockRejectedValue(new Error('Hash failed'));

      await expect(service.register(registerDto)).rejects.toThrow(
        'Hash failed',
      );
    });
  });

  describe('login', () => {
    const loginDto = {
      email: 'test@example.com',
      password: 'password123',
    };

    const mockUser = {
      id: 'user-id',
      email: loginDto.email,
      password: 'hashed-password',
      alias: 'testuser',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    beforeEach(() => {
      mockJwtService.sign.mockReturnValue('jwt-token');
    });

    it('should login user successfully when credentials are correct', async () => {
      mockUsersService.findByEmail.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.login(loginDto);

      expect(mockUsersService.findByEmail).toHaveBeenCalledWith(loginDto.email);
      expect(bcrypt.compare).toHaveBeenCalledWith(
        loginDto.password,
        mockUser.password,
      );
      expect(mockJwtService.sign).toHaveBeenCalledWith({
        email: mockUser.email,
        userId: mockUser.id,
      });
      expect(result.accessToken).toEqual('jwt-token');
      expect(result.user).toBeDefined();

      expect(result.user).not.toHaveProperty('password');
    });

    it('should throw UnauthorizedException if user is not found', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(
        new UnauthorizedException('Please check your login credentials'),
      );

      expect(mockUsersService.findByEmail).toHaveBeenCalledWith(loginDto.email);
      expect(bcrypt.compare).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException if password is incorrect', async () => {
      mockUsersService.findByEmail.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.login(loginDto)).rejects.toThrow(
        new UnauthorizedException('Please check your login credentials'),
      );

      expect(mockUsersService.findByEmail).toHaveBeenCalledWith(loginDto.email);
      expect(bcrypt.compare).toHaveBeenCalledWith(
        loginDto.password,
        mockUser.password,
      );
      expect(mockJwtService.sign).not.toHaveBeenCalled();
    });

    it('should handle bcrypt compare failure', async () => {
      mockUsersService.findByEmail.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockRejectedValue(
        new Error('Compare failed'),
      );

      await expect(service.login(loginDto)).rejects.toThrow('Compare failed');
    });
  });
});
