import fs from 'fs';
import csvParse from 'csv-parse';

import { getCustomRepository, getRepository, In } from 'typeorm';
import Transaction from '../models/Transaction';
import TransactionsRepository from '../repositories/TransactionsRepository';
import Category from '../models/Category';

interface CSVTransaction {
  title: string;
  type: 'income' | 'outcome';
  value: number;
  category: string;
}

class ImportTransactionsService {
  async execute(filePath: string): Promise<Transaction[]> {
    const fileReadStream = fs.createReadStream(filePath);

    const dataParser = csvParse({
      from_line: 2,
    });

    const transactions: CSVTransaction[] = [];
    const categories: string[] = [];

    const parsedData = fileReadStream.pipe(dataParser);

    parsedData.on('data', async line => {
      const [title, type, value, category] = line.map((cell: string) =>
        cell.trim(),
      );

      if (!title || !type || !value || !category) return;

      categories.push(category);

      transactions.push({ title, type, value, category });
    });

    await new Promise(resolve => parsedData.on('end', resolve));

    /**
     * Create new categories
     */
    const categoriesRepository = getRepository(Category);
    const existentCategories = await categoriesRepository.find({
      where: { title: In(categories) },
    });
    const existentCategoriesTitles = existentCategories.map(
      category => category.title,
    );
    const toCreateCategoriesTitles = categories
      .filter(category => !existentCategoriesTitles.includes(category))
      .filter((value, index, self) => self.indexOf(value) === index);
    const newCategories = categoriesRepository.create(
      toCreateCategoriesTitles.map(title => ({ title })),
    );
    await categoriesRepository.save(newCategories);

    const usedCategories = [...existentCategories, ...newCategories];

    /**
     * Create transactions
     */
    const transactionsRepository = getCustomRepository(TransactionsRepository);
    const newTransactions = transactionsRepository.create(
      transactions.map(transaction => ({
        title: transaction.title,
        value: transaction.value,
        type: transaction.type,
        category: usedCategories.find(
          category => category.title === transaction.category,
        ),
      })),
    );
    await transactionsRepository.save(newTransactions);

    /**
     * Delete file
     */
    await fs.promises.unlink(filePath);

    return newTransactions;
  }
}

export default ImportTransactionsService;
