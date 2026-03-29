export interface FormFieldProps {
  name: string;
  label: string;
  type?: "text" | "textarea" | "select" | "checkbox" | "email" | "password";
  value?: string;
  error?: string;
  required?: boolean;
  options?: { value: string; label: string }[];
  hint?: string;
  rows?: number;
  multiple?: boolean;
  readonly?: boolean;
}

const baseInputClass =
  "block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm";

export function FormField({
  name,
  label,
  type = "text",
  value,
  error,
  required,
  options,
  hint,
  rows = 4,
  multiple,
  readonly,
}: FormFieldProps) {
  const outlineClass = error
    ? "outline-1 -outline-offset-1 outline-red-500"
    : "outline-1 -outline-offset-1 outline-gray-300";
  const readonlyClass = readonly ? "bg-gray-50" : "";
  const inputClass = `${baseInputClass} ${outlineClass} ${readonlyClass}`;

  if (type === "checkbox") {
    return (
      <div className="flex gap-x-3">
        <div className="flex h-6 items-center">
          <input
            id={name}
            name={name}
            type="checkbox"
            defaultChecked={value === "true"}
            className="size-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
          />
        </div>
        <div className="text-sm leading-6">
          <label htmlFor={name} className="font-medium text-gray-900">
            {label}
          </label>
          {hint && <p className="text-gray-500">{hint}</p>}
        </div>
      </div>
    );
  }

  return (
    <div>
      <label htmlFor={name} className="block text-sm font-medium text-gray-900">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <div className="mt-2">
        {type === "textarea"
          ? (
            <textarea
              id={name}
              name={name}
              rows={rows}
              defaultValue={value}
              required={required}
              readOnly={readonly}
              aria-describedby={error
                ? `${name}-error`
                : hint
                ? `${name}-hint`
                : undefined}
              className={inputClass}
            />
          )
          : type === "select"
          ? (
            <select
              id={name}
              name={multiple ? `${name}[]` : name}
              multiple={multiple}
              size={multiple ? 5 : undefined}
              defaultValue={multiple
                ? (value?.startsWith("[")
                  ? JSON.parse(value) as string[]
                  : value
                  ? [value]
                  : [])
                : value}
              required={required}
              aria-describedby={error
                ? `${name}-error`
                : hint
                ? `${name}-hint`
                : undefined}
              className={inputClass}
            >
              {!multiple && <option value="">Select...</option>}
              {options?.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          )
          : (
            <input
              type={type}
              id={name}
              name={name}
              defaultValue={value}
              required={required}
              readOnly={readonly}
              aria-describedby={error
                ? `${name}-error`
                : hint
                ? `${name}-hint`
                : undefined}
              className={inputClass}
            />
          )}
      </div>
      {error && (
        <p
          id={`${name}-error`}
          className="mt-2 text-sm text-red-600"
          role="alert"
        >
          {error}
        </p>
      )}
      {!error && hint && (
        <p id={`${name}-hint`} className="mt-2 text-sm text-gray-500">
          {hint}
        </p>
      )}
    </div>
  );
}
