import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus, Logger } from '@nestjs/common';
import { Prisma } from '@shopia/db';

/** Ubah error database menjadi respons HTTP yang jelas, tanpa membocorkan detail internal. */
@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('Database');

  catch(err: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse();
    const map: Record<string, [number, string]> = {
      P2002: [HttpStatus.CONFLICT, 'Data sudah ada'],
      P2025: [HttpStatus.NOT_FOUND, 'Data tidak ditemukan'],
      P2003: [HttpStatus.CONFLICT, 'Data masih dipakai oleh data lain'],
    };
    const [status, message] = map[err.code] ?? [HttpStatus.INTERNAL_SERVER_ERROR, 'Terjadi kesalahan pada server'];
    if (status === HttpStatus.INTERNAL_SERVER_ERROR) this.logger.error(`${err.code}: ${err.message}`);
    res.status(status).json({ statusCode: status, message });
  }
}
