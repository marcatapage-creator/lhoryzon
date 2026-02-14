"use server";

import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { signIn } from "@/auth";
import { AuthError } from "next-auth";

const RegisterSchema = z.object({
    name: z.string().min(2, { message: "Le nom doit faire au moins 2 caractères." }),
    email: z.string().email({ message: "Email invalide." }),
    password: z.string().min(6, { message: "Le mot de passe doit faire au moins 6 caractères." }),
});

export async function register(prevState: string | undefined, formData: FormData) {
    const validatedFields = RegisterSchema.safeParse({
        name: formData.get("name"),
        email: formData.get("email"),
        password: formData.get("password"),
    });

    if (!validatedFields.success) {
        return "Champs invalides. Veuillez vérifier vos entrées.";
    }

    const { name, email, password } = validatedFields.data;

    try {
        const existingUser = await prisma.user.findUnique({
            where: { email: email.toLowerCase() },
        });

        if (existingUser) {
            return "Cet email est déjà utilisé.";
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        await prisma.user.create({
            data: {
                name,
                email: email.toLowerCase(),
                password: hashedPassword,
            },
        });

        // Automatically sign in after registration
        try {
            await signIn("credentials", {
                email,
                password,
                redirect: false,
            });
        } catch (error) {
            if (error instanceof AuthError) {
                switch (error.type) {
                    case "CredentialsSignin":
                        return "Identifiants invalides lors de la connexion automatique.";
                    default:
                        return "Erreur lors de la connexion automatique.";
                }
            }
            throw error; // Let outer catch handle it
        }

        return null; // Success
    } catch (error) {
        console.error("Registration error:", error);
        return "Une erreur est survenue lors de la création du compte.";
    }
}
