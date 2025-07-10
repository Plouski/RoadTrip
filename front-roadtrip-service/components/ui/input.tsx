import * as React from "react"

import { cn } from "@/lib/utils"

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    const passwordPattern =
      "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[!@#$%^&*()_+\\-=\\[\\]{};':\"\\\\|,.<>\\/?]).{8,}$";

    const emailPattern = "^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$";

    return (
      <input
        type={type}
        pattern={
          type === "password"
            ? passwordPattern
            : type === "email"
            ? emailPattern
            : undefined
        }
        title={
          type === "password"
            ? "Le mot de passe doit contenir au moins 8 caractères, une majuscule, une minuscule, un chiffre et un caractère spécial."
            : type === "email"
            ? "Veuillez entrer une adresse email valide (exemple@domaine.com)."
            : undefined
        }
        className={cn(
          "flex h-10 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-base text-black transition-colors hover:border-gray-300 focus:border-red-600 focus:outline-none focus:ring-1 focus:ring-red-600 placeholder:text-gray-400 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);

Input.displayName = "Input"

export { Input }