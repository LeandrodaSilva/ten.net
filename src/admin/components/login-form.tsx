import { renderToString } from "react-dom/server";
import { FormField } from "./form-field.tsx";
import { Button } from "./button.tsx";
import { Alert } from "./alert.tsx";

export function LoginForm({ error }: { error?: string }) {
  return (
    <html lang="en" className="h-full bg-gray-100">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Login — Ten.net Admin</title>
        <script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4">
        </script>
      </head>
      <body className="h-full">
        <div className="flex min-h-full flex-col justify-center px-6 py-12 lg:px-8">
          <div className="sm:mx-auto sm:w-full sm:max-w-sm">
            <img
              alt="Ten.net"
              src="https://tailwindcss.com/plus-assets/img/logos/mark.svg?color=indigo&shade=600"
              className="mx-auto h-10 w-auto"
            />
            <h2 className="mt-10 text-center text-2xl font-bold tracking-tight text-gray-900">
              Sign in to admin
            </h2>
          </div>
          <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-sm">
            {error && (
              <Alert
                type="error"
                title={error}
                dismissible={false}
              />
            )}
            <form method="POST" action="/admin/login" className="space-y-6">
              <FormField
                name="username"
                label="Username"
                type="text"
                required
              />
              <FormField
                name="password"
                label="Password"
                type="password"
                required
              />
              <Button variant="primary" size="lg" type="submit">
                Sign in
              </Button>
            </form>
          </div>
        </div>
      </body>
    </html>
  );
}

export function loginPage(error?: string): string {
  return `<!DOCTYPE html>${renderToString(<LoginForm error={error} />)}`;
}
