import * as bcrypt from 'bcrypt';

export const hashPassword = (password: string) => bcrypt.hash(password, 10);

export const comparePassword = (raw: string, hash: string) => bcrypt.compare(raw, hash);
