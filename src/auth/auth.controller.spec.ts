import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { RegisterUserDto } from './dto/register-user.dto';
import { LoginUserDto } from './dto/login-user.dto';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: AuthService;

  const mockAuthService = {
    register: jest.fn(),
    login: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
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
      const registerDto: RegisterUserDto = {
        email: 'test@example.com',
        password: 'password123',
      };
      const mockResult = { access_token: 'test-token' };
      
      mockAuthService.register.mockResolvedValue(mockResult);
      
      const result = await controller.register(registerDto);
      
      expect(result).toEqual(mockResult);
      expect(mockAuthService.register).toHaveBeenCalledWith(registerDto);
      expect(mockAuthService.register).toHaveBeenCalledTimes(1);
    });

    it('should handle errors from authService.register', async () => {
      const registerDto: RegisterUserDto = {
        email: 'test@example.com',
        password: 'password123',
      };
      
      mockAuthService.register.mockRejectedValue(new Error('Registration failed'));
      
      await expect(controller.register(registerDto)).rejects.toThrow('Registration failed');
      expect(mockAuthService.register).toHaveBeenCalledWith(registerDto);
    });
  });

  describe('login', () => {
    it('should call authService.login with correct parameters', async () => {
      const loginDto: LoginUserDto = {
        email: 'test@example.com',
        password: 'password123',
      };
      const mockResult = { access_token: 'test-token' };
      
      mockAuthService.login.mockResolvedValue(mockResult);
      
      const result = await controller.login(loginDto);
      
      expect(result).toEqual(mockResult);
      expect(mockAuthService.login).toHaveBeenCalledWith(loginDto);
      expect(mockAuthService.login).toHaveBeenCalledTimes(1);
    });

    it('should handle errors from authService.login', async () => {
      const loginDto: LoginUserDto = {
        email: 'test@example.com',
        password: 'password123',
      };
      
      mockAuthService.login.mockRejectedValue(new Error('Login failed'));
      
      await expect(controller.login(loginDto)).rejects.toThrow('Login failed');
      expect(mockAuthService.login).toHaveBeenCalledWith(loginDto);
    });
  });
});
