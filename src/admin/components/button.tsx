import type { ReactNode } from "react";

export interface ButtonProps {
  variant?: "primary" | "secondary" | "danger";
  size?: "sm" | "md" | "lg";
  type?: "button" | "submit" | "reset";
  href?: string;
  disabled?: boolean;
  children: ReactNode;
}

const variantClasses = {
  primary:
    "bg-indigo-600 text-white shadow-xs hover:bg-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600",
  secondary:
    "bg-white text-gray-900 ring-1 ring-gray-300 ring-inset shadow-xs hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600",
  danger:
    "bg-red-600 text-white shadow-xs hover:bg-red-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600",
};

const sizeClasses = {
  sm: "px-2.5 py-1.5 text-xs rounded-md",
  md: "px-3 py-2 text-sm rounded-md",
  lg: "px-4 py-2.5 text-sm rounded-md",
};

export function Button({
  variant = "primary",
  size = "md",
  type = "button",
  href,
  disabled = false,
  children,
}: ButtonProps) {
  const classes = `${sizeClasses[size]} ${
    variantClasses[variant]
  } font-semibold text-center${
    disabled ? " opacity-50 cursor-not-allowed pointer-events-none" : ""
  }`;

  if (href) {
    return (
      <a href={href} className={`block ${classes}`}>
        {children}
      </a>
    );
  }

  return (
    <button type={type} disabled={disabled} className={classes}>
      {children}
    </button>
  );
}
