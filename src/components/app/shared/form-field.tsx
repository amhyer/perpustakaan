"use client";

/**
 * FormField — Smart form field wrapper dengan validation.
 *
 * Sprint I - Accessibility & Mobile-First UX.
 *
 * Features:
 * - Integrates dengan validation library
 * - Real-time validation (on blur or change)
 * - Visual error state
 * - Helper text
 * - Required indicator
 * - ARIA attributes (aria-invalid, aria-describedby)
 * - Auto-focus on error
 *
 * Usage:
 *   <FormField
 *     name="email"
 *     label="Email"
 *     type="email"
 *     value={email}
 *     onChange={setEmail}
 *     validator={emailRules()}
 *     values={formData}
 *     required
 *   />
 */

import { useState, useEffect, useRef } from "react";
import { AlertCircle, CheckCircle2, Info } from "lucide-react";
import { Input } from "@/components/ui/form/input";
import { Label } from "@/components/ui/form/label";
import { Textarea } from "@/components/ui/form/textarea";
import { cn } from "@/lib/utils";

export type ValidationTiming = "onChange" | "onBlur" | "onSubmit";

interface FormFieldProps {
  /** Field name (used as id and key for errors) */
  name: string;
  /** Display label */
  label?: string;
  /** Placeholder text */
  placeholder?: string;
  /** Helper text shown below input */
  helperText?: string;
  /** Input type */
  type?: "text" | "email" | "password" | "tel" | "url" | "number" | "date" | "search";
  /** Use textarea instead of input */
  multiline?: boolean;
  /** Number of rows for textarea */
  rows?: number;
  /** Current value */
  value: string | number;
  /** Change handler */
  onChange: (value: string) => void;
  /** Blur handler */
  onBlur?: () => void;
  /** Validator function (from validation.ts) */
  validator?: (value: any, allValues?: Record<string, any>) => string | null;
  /** All form values (for cross-field validation) */
  values?: Record<string, any>;
  /** External error (overrides internal) */
  error?: string;
  /** Mark as required (visual + ARIA) */
  required?: boolean;
  /** When to validate */
  validateOn?: ValidationTiming;
  /** Auto-focus on error */
  autoFocusOnError?: boolean;
  /** Disabled state */
  disabled?: boolean;
  /** Read-only state */
  readOnly?: boolean;
  /** Min/max for number inputs */
  min?: number;
  max?: number;
  /** Max length for text inputs */
  maxLength?: number;
  /** Pattern for input validation */
  pattern?: string;
  /** Required prop pass-through */
  autoComplete?: string;
  /** Custom class for the input */
  inputClassName?: string;
  /** Wrapper className */
  className?: string;
}

export function FormField({
  name,
  label,
  placeholder,
  helperText,
  type = "text",
  multiline = false,
  rows = 3,
  value,
  onChange,
  onBlur,
  validator,
  values,
  error: externalError,
  required = false,
  validateOn = "onBlur",
  autoFocusOnError = true,
  disabled = false,
  readOnly = false,
  min,
  max,
  maxLength,
  pattern,
  autoComplete,
  inputClassName,
  className,
}: FormFieldProps) {
  const [internalError, setInternalError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  const error = externalError ?? internalError;

  // Run validator
  const runValidation = (val: any) => {
    if (!validator) return null;
    return validator(val, values);
  };

  // Validate when value changes (if touched and validateOn=onChange)
  useEffect(() => {
    if (validateOn === "onChange" && touched && validator) {
      const err = runValidation(value);
      setInternalError(err);
    }
  }, [value, validateOn, touched, validator, values]);

  // Auto-focus on error
  useEffect(() => {
    if (error && autoFocusOnError && inputRef.current) {
      inputRef.current.focus();
    }
  }, [error, autoFocusOnError]);

  const handleChange = (newValue: string) => {
    onChange(newValue);
    if (validateOn === "onChange" && touched && validator) {
      const err = runValidation(newValue);
      setInternalError(err);
    }
  };

  const handleBlur = () => {
    setTouched(true);
    onBlur?.();
    if (validateOn === "onBlur" && validator) {
      const err = runValidation(value);
      setInternalError(err);
    }
  };

  // Check if value is valid (for green checkmark)
  const showSuccess = !error && touched && validator && value && runValidation(value) === null;

  const inputId = `field-${name}`;
  const helperId = `${inputId}-helper`;
  const errorId = `${inputId}-error`;

  return (
    <div className={cn("space-y-1.5", className)}>
      {label && (
        <Label
          htmlFor={inputId}
          className="text-sm font-medium flex items-center gap-1"
        >
          {label}
          {required && (
            <span className="text-red-500" aria-label="required">
              *
            </span>
          )}
        </Label>
      )}

      <div className="relative">
        {multiline ? (
          <Textarea
            ref={inputRef as any}
            id={inputId}
            name={name}
            value={String(value)}
            onChange={(e) => handleChange(e.target.value)}
            onBlur={handleBlur}
            placeholder={placeholder}
            disabled={disabled}
            readOnly={readOnly}
            rows={rows}
            maxLength={maxLength}
            aria-invalid={!!error}
            aria-describedby={cn(
              helperText && helperId,
              error && errorId
            )}
            className={cn(
              error && "border-red-500 focus-visible:ring-red-500",
              showSuccess && "border-green-500 focus-visible:ring-green-500",
              inputClassName
            )}
          />
        ) : (
          <Input
            ref={inputRef as any}
            id={inputId}
            name={name}
            type={type}
            value={String(value)}
            onChange={(e) => handleChange(e.target.value)}
            onBlur={handleBlur}
            placeholder={placeholder}
            disabled={disabled}
            readOnly={readOnly}
            min={min}
            max={max}
            maxLength={maxLength}
            pattern={pattern}
            autoComplete={autoComplete}
            aria-invalid={!!error}
            aria-describedby={cn(
              helperText && helperId,
              error && errorId
            )}
            className={cn(
              error && "border-red-500 focus-visible:ring-red-500 pr-10",
              showSuccess && "border-green-500 focus-visible:ring-green-500 pr-10",
              inputClassName
            )}
          />
        )}

        {/* Status icons */}
        {error && (
          <AlertCircle
            className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-red-500 pointer-events-none"
            aria-hidden="true"
          />
        )}
        {showSuccess && !error && (
          <CheckCircle2
            className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-green-500 pointer-events-none"
            aria-hidden="true"
          />
        )}
      </div>

      {/* Helper text */}
      {helperText && !error && (
        <p
          id={helperId}
          className="text-xs text-muted-foreground flex items-center gap-1"
        >
          <Info className="h-3 w-3 shrink-0" />
          {helperText}
        </p>
      )}

      {/* Error message */}
      {error && (
        <p
          id={errorId}
          role="alert"
          aria-live="polite"
          className="text-xs text-red-600 flex items-center gap-1"
        >
          <AlertCircle className="h-3 w-3 shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}

/**
 * FormErrorSummary — Display all form errors at top.
 */
export function FormErrorSummary({ errors }: { errors: Record<string, string> }) {
  const errorList = Object.entries(errors);
  if (errorList.length === 0) return null;

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="p-3 bg-red-50 border border-red-200 rounded-lg"
    >
      <div className="flex items-start gap-2">
        <AlertCircle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="font-medium text-red-800 mb-1">
            Mohon perbaiki {errorList.length} kesalahan:
          </p>
          <ul className="text-xs text-red-700 space-y-0.5 list-disc list-inside">
            {errorList.map(([field, msg]) => (
              <li key={field}>
                <strong className="capitalize">{field}:</strong> {msg}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
