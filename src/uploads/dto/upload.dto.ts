import { IsOptional, IsString, Matches } from 'class-validator';

export class UploadDto {
  /**
   * Cloudinary folder — hamesha al-ucaaz/ ke andar resolve hota hai.
   * Example: 'products' -> 'al-ucaaz/products'
   */
  @IsOptional()
  @IsString()
  @Matches(/^[a-zA-Z0-9_-]+(\/[a-zA-Z0-9_-]+)*$/, {
    message: 'folder me sirf letters, numbers, _, - aur / allowed hain',
  })
  folder?: string;
}
