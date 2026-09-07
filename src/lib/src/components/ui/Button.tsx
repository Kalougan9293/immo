import Link from "next/link";
import { ArrowRight, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "ghost" | "gold";

type CommonProps = {
  children: React.ReactNode;
  className?: string;
  variant?: ButtonVariant;
  icon?: LucideIcon;
  showArrow?: boolean;
  fullWidth?: boolean;
};

type ButtonAsButton = CommonProps &
  Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, keyof CommonProps> & {
    href?: undefined;
  };

type ButtonAsLink = CommonProps & {
  href: string;
};

type ButtonProps = ButtonAsButton | ButtonAsLink;

const variants: Record<ButtonVariant, string> = {
  primary: "glass-cta text-pearl hover:text-white active:scale-[0.98]",
  ghost:
    "border border-border bg-transparent text-muted-strong hover:border-border-strong hover:text-pearl active:scale-[0.98]",
  gold:
    "border border-gold/40 bg-gold-soft text-pearl shadow-[0_0_32px_var(--gold-glow)] hover:border-gold/70 hover:bg-[rgba(196,165,116,0.32)] active:scale-[0.98]",
};

export function Button(props: ButtonProps) {
  const {
    children,
    className,
    variant = "primary",
    icon: Icon,
    showArrow = false,
    fullWidth = false,
  } = props;

  const disabled =
    "href" in props && props.href
      ? false
      : Boolean((props as ButtonAsButton).disabled);

  const classes = cn(
    "group inline-flex h-13 min-h-[3.25rem] items-center justify-center gap-2.5 rounded-2xl px-7 text-[15px] font-medium tracking-wide transition-all duration-300 ease-out disabled:pointer-events-none disabled:opacity-40",
    variants[variant],
    fullWidth && "w-full",
    disabled && "opacity-40",
    className,
  );

  const content = (
    <>
      {Icon ? (
        <Icon className="size-[18px] opacity-90" strokeWidth={1.75} />
      ) : null}
      <span>{children}</span>
      {showArrow ? (
        <ArrowRight
          className="size-4 opacity-70 transition-transform duration-300 group-hover:translate-x-0.5"
          strokeWidth={1.75}
        />
      ) : null}
    </>
  );

  if ("href" in props && props.href) {
    if (props.href.startsWith("#") || /^https?:\/\//i.test(props.href)) {
      return (
        <a
          href={props.href}
          className={classes}
          {...(/^https?:\/\//i.test(props.href)
            ? { target: "_blank", rel: "noopener noreferrer" }
            : {})}
        >
          {content}
        </a>
      );
    }

    return (
      <Link href={props.href} className={classes}>
        {content}
      </Link>
    );
  }

  const {
    children: _c,
    className: _cl,
    variant: _v,
    icon: _i,
    showArrow: _s,
    fullWidth: _f,
    href: _h,
    ...buttonProps
  } = props as ButtonAsButton & { href?: undefined };

  return (
    <button type={buttonProps.type ?? "button"} className={classes} {...buttonProps}>
      {content}
    </button>
  );
}
