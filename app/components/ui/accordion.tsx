import * as React from "react";
import { ChevronDownIcon } from "lucide-react";
import { cn } from "~/lib/utils";

interface AccordionContextType {
  value: string[];
  onValueChange: (value: string[]) => void;
}

const AccordionContext = React.createContext<AccordionContextType | null>(null);

interface AccordionProps {
  type?: "single" | "multiple";
  value?: string | string[];
  defaultValue?: string | string[];
  onValueChange?: (value: string | string[]) => void;
  children: React.ReactNode;
  className?: string;
}

function Accordion({
  type = "single",
  value,
  defaultValue,
  onValueChange,
  children,
  className,
  ...props
}: AccordionProps) {
  const [internalValue, setInternalValue] = React.useState<string[]>(() => {
    if (value !== undefined) {
      return Array.isArray(value) ? value : [value];
    }
    if (defaultValue !== undefined) {
      return Array.isArray(defaultValue) ? defaultValue : [defaultValue];
    }
    return [];
  });

  const currentValue =
    value !== undefined
      ? Array.isArray(value)
        ? value
        : [value]
      : internalValue;

  const handleValueChange = React.useCallback(
    (newValue: string[]) => {
      if (value === undefined) {
        setInternalValue(newValue);
      }
      if (onValueChange) {
        if (type === "single") {
          onValueChange(newValue[0] || "");
        } else {
          onValueChange(newValue);
        }
      }
    },
    [value, onValueChange, type]
  );

  return (
    <AccordionContext.Provider
      value={{ value: currentValue, onValueChange: handleValueChange }}
    >
      <div className={cn("space-y-0", className)} {...props}>
        {children}
      </div>
    </AccordionContext.Provider>
  );
}

interface AccordionItemProps {
  value: string;
  children: React.ReactNode;
  className?: string;
}

function AccordionItem({
  value,
  children,
  className,
  ...props
}: AccordionItemProps) {
  return (
    <div
      className={cn("border-b last:border-b-0", className)}
      data-value={value}
      {...props}
    >
      {children}
    </div>
  );
}

interface AccordionTriggerProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  "data-value"?: string;
}

function AccordionTrigger({
  children,
  className,
  onClick,
  ...props
}: AccordionTriggerProps) {
  const context = React.useContext(AccordionContext);
  if (!context) {
    throw new Error("AccordionTrigger must be used within an Accordion");
  }

  const { value, onValueChange } = context;
  const isOpen = value.includes(props["data-value"] as string);

  const handleClick = () => {
    if (onClick) {
      onClick();
    }

    const itemValue = props["data-value"] as string;
    if (isOpen) {
      onValueChange(value.filter((v) => v !== itemValue));
    } else {
      onValueChange([...value, itemValue]);
    }
  };

  return (
    <button
      className={cn(
        "flex flex-1 items-start justify-between gap-4 rounded-md py-4 text-left text-sm font-medium transition-all outline-none hover:underline focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0 disabled:pointer-events-none disabled:opacity-50",
        isOpen && "[&>svg]:rotate-180",
        className
      )}
      onClick={handleClick}
      {...props}
    >
      {children}
      <ChevronDownIcon className="text-muted-foreground pointer-events-none size-4 shrink-0 translate-y-0.5 transition-transform duration-200" />
    </button>
  );
}

interface AccordionContentProps {
  children: React.ReactNode;
  className?: string;
  "data-value"?: string;
}

function AccordionContent({
  children,
  className,
  ...props
}: AccordionContentProps) {
  const context = React.useContext(AccordionContext);
  if (!context) {
    throw new Error("AccordionContent must be used within an Accordion");
  }

  const { value } = context;
  const isOpen = value.includes(props["data-value"] as string);

  return (
    <div
      className={cn(
        "overflow-hidden text-sm transition-all",
        isOpen ? "animate-accordion-down" : "animate-accordion-up"
      )}
      style={{
        height: isOpen ? "auto" : "0px",
      }}
      {...props}
    >
      <div className={cn("pt-0 pb-4", className)}>{isOpen && children}</div>
    </div>
  );
}

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent };
