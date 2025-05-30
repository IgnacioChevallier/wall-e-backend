import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { CreateUserDto } from './dto/create-user.dto';
import { LoginDto } from './dto/login.dto';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: AuthService;

  const mockAuthService = {
    register: jest.fn(),
    login: jest.fn(),
    logout: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn().mockReturnValue('development'),
  };

  // Mock response object
  const mockResponse = {
    cookie: jest.fn().mockReturnThis(),
    clearCookie: jest.fn().mockReturnThis(),
  } as unknown as Response;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('register', () => {
    it('should call authService.register with correct parameters', async () => {
      const registerDto: CreateUserDto = {
        email: 'test@example.com',
        password: 'password123',
        alias: 'testuser',
      };
      const mockResult = {
        accessToken: 'test-token',
      };

      mockAuthService.register.mockResolvedValue(mockResult);

      const result = await controller.register(registerDto, mockResponse);

      expect(result).toEqual({ success: true });
      expect(mockAuthService.register).toHaveBeenCalledWith(registerDto);
      expect(mockAuthService.register).toHaveBeenCalledTimes(1);
      expect(mockResponse.cookie).toHaveBeenCalledWith(
        'access_token',
        'test-token',
        expect.any(Object),
      );
    });

    it('should handle errors from authService.register', async () => {
      const registerDto: CreateUserDto = {
        email: 'test@example.com',
        password: 'password123',
        alias: 'testuser',
      };

      mockAuthService.register.mockRejectedValue(
        new Error('Registration failed'),
      );

      await expect(
        controller.register(registerDto, mockResponse),
      ).rejects.toThrow('Registration failed');
      expect(mockAuthService.register).toHaveBeenCalledWith(registerDto);
    });
  });

  describe('login', () => {
    it('should call authService.login with correct parameters', async () => {
      const loginDto: LoginDto = {
        email: 'test@example.com',
        password: 'password123',
      };
      const mockResult = {
        accessToken: 'test-token',
      };

      mockAuthService.login.mockResolvedValue(mockResult);

      const result = await controller.login(loginDto, mockResponse);

      expect(result).toEqual({ success: true });
      expect(mockAuthService.login).toHaveBeenCalledWith(loginDto);
      expect(mockAuthService.login).toHaveBeenCalledTimes(1);
      expect(mockResponse.cookie).toHaveBeenCalledWith(
        'access_token',
        'test-token',
        expect.any(Object),
      );
    });

    it('should handle errors from authService.login', async () => {
      const loginDto: LoginDto = {
        email: 'test@example.com',
        password: 'password123',
      };

      mockAuthService.login.mockRejectedValue(new Error('Login failed'));

      await expect(controller.login(loginDto, mockResponse)).rejects.toThrow(
        'Login failed',
      );
      expect(mockAuthService.login).toHaveBeenCalledWith(loginDto);
    });
  });

  describe('logout', () => {
    it('should call authService.logout and return success', () => {
      const mockResult = { success: true };
      mockAuthService.logout.mockReturnValue(mockResult);

      const result = controller.logout(mockResponse);

      expect(result).toEqual({ success: true });
      expect(mockAuthService.logout).toHaveBeenCalledWith(mockResponse);
      expect(mockAuthService.logout).toHaveBeenCalledTimes(1);
    });
  });
});
