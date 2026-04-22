import * as React from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface TruncatedCellProps {
  children: React.ReactNode;
  className?: string;
  tooltip?: React.ReactNode;
  side?: "top" | "right" | "bottom" | "left";
  as?: "td" | "div" | "span";
  align?: "left" | "right" | "center";
}

export function TruncatedCell({
  children,
  className,
  tooltip,
  side = "top",
  as: Component = "td",
  align = "left",
}: TruncatedCellProps) {
  const content = (
    <span className={cn("block truncate min-w-0", className)}>
      {children}
    </span>
  );

  const alignClass = {
    left: "text-left",
    right: "text-right",
    center: "text-center",
  }[align];

  if (!tooltip) {
    return (
      <Component className={cn("px-4 sm:px-5 py-3", alignClass)}>
        {content}
      </Component>
    );
  }

  return (
    <Component className={cn("px-4 sm:px-5 py-3 max-w-0", alignClass)}>
      <TooltipProvider delayDuration={150}>
        <Tooltip>
          <TooltipTrigger asChild>
            {content}
          </TooltipTrigger>
          <TooltipContent side={side} className="max-w-xs break-words">
            {tooltip}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </Component>
  );
}

interface TruncatedTextProps {
  text: string;
  className?: string;
  tooltipSide?: "top" | "right" | "bottom" | "left";
  maxWidth?: string;
}

export function TruncatedText({
  text,
  className,
  tooltipSide = "top",
  maxWidth,
}: TruncatedTextProps) {
  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className={cn("block truncate", className)}
            style={maxWidth ? { maxWidth } : undefined}
          >
            {text}
          </span>
        </TooltipTrigger>
        <TooltipContent side={tooltipSide} className="max-w-xs break-words">
          {text}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
