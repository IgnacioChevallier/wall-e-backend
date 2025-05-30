import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { ConflictException, UnauthorizedException } from '@nestjs/common';

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

    const mockCreatedUser = {
      id: 'user-id',
      email: registerDto.email,
      password: registerDto.password,
      alias: registerDto.alias,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    beforeEach(() => {
      mockUsersService.create.mockResolvedValue(mockCreatedUser);
      mockJwtService.sign.mockReturnValue('jwt-token');
    });

    it('should register a new user successfully', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);
      mockUsersService.findByAlias.mockResolvedValue(null);

      const result = await service.register(registerDto);

      expect(mockUsersService.findByEmail).toHaveBeenCalledWith(
        registerDto.email,
      );
      expect(mockUsersService.create).toHaveBeenCalledWith({
        email: registerDto.email,
        password: registerDto.password,
        alias: registerDto.alias,
      });
      expect(mockJwtService.sign).toHaveBeenCalledWith({
        email: mockCreatedUser.email,
        userId: mockCreatedUser.id,
      });
      expect(result.accessToken).toEqual('jwt-token');
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
  });

  describe('login', () => {
    const loginDto = {
      email: 'test@example.com',
      password: 'password123',
    };

    const mockUser = {
      id: 'user-id',
      email: loginDto.email,
      password: loginDto.password, // Plain text password for testing
      alias: 'testuser',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    beforeEach(() => {
      mockJwtService.sign.mockReturnValue('jwt-token');
    });

    it('should login user successfully when credentials are correct', async () => {
      mockUsersService.findByEmail.mockResolvedValue(mockUser);

      const result = await service.login(loginDto);

      expect(mockUsersService.findByEmail).toHaveBeenCalledWith(loginDto.email);
      expect(mockJwtService.sign).toHaveBeenCalledWith({
        email: mockUser.email,
        userId: mockUser.id,
      });
      expect(result.accessToken).toEqual('jwt-token');
    });

    it('should throw UnauthorizedException if user is not found', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(
        new UnauthorizedException('Please check your login credentials'),
      );

      expect(mockUsersService.findByEmail).toHaveBeenCalledWith(loginDto.email);
    });

    it('should throw UnauthorizedException if password is incorrect', async () => {
      const userWithWrongPassword = {
        ...mockUser,
        password: 'wrong-password',
      };
      mockUsersService.findByEmail.mockResolvedValue(userWithWrongPassword);

      await expect(service.login(loginDto)).rejects.toThrow(
        new UnauthorizedException('Please check your login credentials'),
      );

      expect(mockUsersService.findByEmail).toHaveBeenCalledWith(loginDto.email);
      expect(mockJwtService.sign).not.toHaveBeenCalled();
    });
  });

  describe('generateJwt', () => {
    it('should generate JWT token', () => {
      const payload = { sub: 'user-id', email: 'test@example.com' };
      mockJwtService.sign.mockReturnValue('generated-jwt-token');

      const result = service.generateJwt(payload);

      expect(mockJwtService.sign).toHaveBeenCalledWith({
        email: payload.email,
        userId: payload.sub,
      });
      expect(result).toEqual('generated-jwt-token');
    });
  });

  describe('logout', () => {
    it('should clear cookie and return success', () => {
      const mockResponse = {
        clearCookie: jest.fn(),
      } as any;

      const result = service.logout(mockResponse);

      expect(mockResponse.clearCookie).toHaveBeenCalledWith('access_token');
      expect(result).toEqual({ success: true });
    });
  });
});
