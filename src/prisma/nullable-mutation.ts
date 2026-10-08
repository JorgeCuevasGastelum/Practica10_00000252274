import { Prisma } from "../../generated/prisma/client";
export async function nullableMutation<T>(
  operation: () => Promise<T>,
): Promise<T | null> {
  try {
    return await operation();
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    )
      return null;
    throw error;
  }
}
