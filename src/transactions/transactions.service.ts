import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { P2PTransferDto } from './dto/p2p-transfer.dto';
import { UsersService } from '../users/users.service';
import { WalletService } from '../wallet/wallet.service';
import { TransactionsRepository } from './transactions.repository';
import { User } from '../../generated/prisma';

@Injectable()
export class TransactionsService {
  constructor(
    private usersService: UsersService,
    private walletService: WalletService,
    private transactionsRepository: TransactionsRepository,
  ) {}

  async createP2PTransfer(
    senderUserId: string,
    p2pTransferDto: P2PTransferDto,
  ) {
    const { recipientIdentifier, amount } = p2pTransferDto;

    // 1. Fetch sender
    const sender = await this.usersService.findOne(senderUserId);
    if (!sender) {
      throw new NotFoundException(`Sender with ID ${senderUserId} not found.`);
    }

    // 2. Fetch recipient by email (as per requirement)
    let recipient: User | null = null;
    try {
      recipient = await this.usersService.findByEmailOrAlias(recipientIdentifier);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw new NotFoundException(
          `Recipient with email ${recipientIdentifier} not found.`, 
        );
      }
      throw error; // Re-throw other errors
    }

    if (!recipient) { // Should be caught by findByEmail, but as a safeguard
        throw new NotFoundException(
            `Recipient with email ${recipientIdentifier} not found.`,
        );
    }

    if (sender.id === recipient.id) {
      throw new BadRequestException('Cannot transfer funds to yourself.');
    }

    // 3. Fetch sender's wallet
    const senderWallet = await this.walletService.getWalletByUserId(sender.id);
    if (!senderWallet) {
        throw new NotFoundException(`Wallet for sender ${sender.id} not found. Please ensure the sender has a wallet.`);
    }
    
    //if (senderWallet.balance < amount) {
      //throw new BadRequestException('Insufficient funds.');
    //}

    // 4. Fetch recipient's wallet
    const recipientWallet = await this.walletService.getWalletByUserId(recipient.id);
    if (!recipientWallet) {
      throw new NotFoundException(`Wallet for recipient ${recipient.email} not found. Please ensure the recipient has a wallet.`);
    }

    // 5. Perform the transfer using the repository
    try {
      const { senderTransaction, recipientTransaction } = await this.transactionsRepository.createP2PTransfer({
        amount,
        senderWallet,
        recipientWallet,
        senderDescription: `Transfer to ${recipient.email}`,
        recipientDescription: `Transfer from ${sender.email}`,
      });

      return {
        message: 'Transfer successful',
        senderTransaction,
        recipientTransaction,
      };
    } catch (error) {
      // Log the error for debugging
      console.error("P2P Transfer failed:", error);
      // Re-throw a generic error or a more specific one based on the type of error
      throw new BadRequestException('P2P Transfer failed. Please try again later.');
    }
  }

  create(createTransactionDto: CreateTransactionDto) {
    // This needs to be implemented based on the new schema if it's not P2P
    return 'This action adds a new transaction (implementation pending based on new schema)';
  }

  findAll() {
    return `This action returns all transactions (implementation pending based on new schema)`;
  }

  findOne(id: string) { // Changed id to string
    return `This action returns a #${id} transaction (implementation pending based on new schema)`;
  }

  update(id: string, updateTransactionDto: UpdateTransactionDto) { // Changed id to string
    return `This action updates a #${id} transaction (implementation pending based on new schema)`;
  }

  remove(id: string) { // Changed id to string
    return `This action removes a #${id} transaction (implementation pending based on new schema)`;
  }
}
