import { IsBoolean } from 'class-validator';
export class ReviewStoredFileDto { @IsBoolean() approve: boolean; }
