"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Operation } from "@/lib/compta/types";
import { revalidatePath } from "next/cache";

export async function getOperations(): Promise<Operation[]> {
    const session = await auth();
    if (!session?.user?.id) {
        return []; // Or throw error? Better empty for now to avoid crashes on protected routes
    }

    const ops = await prisma.accountingOperation.findMany({
        where: { userId: session.user.id },
        orderBy: { year: "desc" }
    });

    return ops.map(op => op.data as unknown as Operation);
}

export async function saveOperation(op: Operation) {
    const session = await auth();
    if (!session?.user?.id) {
        throw new Error("Unauthorized");
    }

    // Upsert based on userId + year
    await prisma.accountingOperation.upsert({
        where: {
            userId_year: {
                userId: session.user.id,
                year: op.year
            }
        },
        create: {
            userId: session.user.id,
            year: op.year,
            data: op as any // Cast for Prisma Json
        },
        update: {
            data: op as any
        }
    });

    revalidatePath("/dashboard");
    revalidatePath("/operations");
}

export async function deleteOperation(year: number) {
    const session = await auth();
    if (!session?.user?.id) {
        throw new Error("Unauthorized");
    }

    try {
        await prisma.accountingOperation.delete({
            where: {
                userId_year: {
                    userId: session.user.id,
                    year: year
                }
            }
        });
        revalidatePath("/dashboard");
        revalidatePath("/operations");
        return { success: true };
    } catch (e) {
        return { success: false, error: "Not found" };
    }
}
