import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { CurrentUser } from '../common/decorators/auth.decorators';
import { AuthUser } from '../common/types/auth-user';
import { AttachmentsService, UploadedFileLike } from './attachments.service';

const HARD_LIMIT_BYTES = 20 * 1024 * 1024;

@ApiTags('Anexos')
@ApiBearerAuth()
@Controller()
export class AttachmentsController {
  constructor(private readonly attachmentsService: AttachmentsService) {}

  @Post('correspondences/:id/attachments')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: HARD_LIMIT_BYTES, files: 1 },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  upload(
    @Param('id', new ParseUUIDPipe()) id: string,
    @UploadedFile() file: UploadedFileLike | undefined,
    @CurrentUser() user: AuthUser,
  ) {
    return this.attachmentsService.upload(id, user, file);
  }

  @Get('attachments/:id/download')
  async download(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() user: AuthUser,
    @Res() response: Response,
  ): Promise<void> {
    const file = await this.attachmentsService.download(id, user);
    response.setHeader('Content-Type', file.mimeType);
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Cache-Control', 'private, no-store');
    response.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(file.fileName)}"; filename*=UTF-8''${encodeURIComponent(file.fileName)}`,
    );
    response.send(file.buffer);
  }
}
