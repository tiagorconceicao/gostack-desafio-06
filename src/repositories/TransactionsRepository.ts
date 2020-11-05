import { EntityRepository, Repository } from 'typeorm';

import Transaction from '../models/Transaction';

interface Balance {
  income: number;
  outcome: number;
  total: number;
}

@EntityRepository(Transaction)
class TransactionsRepository extends Repository<Transaction> {
  private async getIncome(): Promise<number> {
    const incomeTransactions = await this.find({ where: { type: 'income' } });

    const income = incomeTransactions.reduce((accumulator, transaction) => {
      return accumulator + transaction.value;
    }, 0);

    return income;
  }

  private async getOutcome(): Promise<number> {
    const outcomeTransactions = await this.find({ where: { type: 'outcome' } });

    const outcome = outcomeTransactions.reduce((accumulator, transaction) => {
      return accumulator + transaction.value;
    }, 0);

    return outcome;
  }

  public async getBalance(): Promise<Balance> {
    const income = await this.getIncome();
    const outcome = await this.getOutcome();

    return {
      income,
      outcome,
      total: income - outcome,
    };
  }
}

export default TransactionsRepository;
