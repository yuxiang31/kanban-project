/**
 * @fileoverview Inline SVG icons for tool actions (stroke icons on a 20px
 * grid). Decorative: the button around them carries the accessible name.
 */

/** @param {{children: *}} props */
function Icon({children}) {
  return (
    <svg
      className="icon"
      width="18"
      height="18"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}

export const GripIcon = () => (
  <Icon>
    <circle cx="7.5" cy="5" r="0.9" fill="currentColor" />
    <circle cx="12.5" cy="5" r="0.9" fill="currentColor" />
    <circle cx="7.5" cy="10" r="0.9" fill="currentColor" />
    <circle cx="12.5" cy="10" r="0.9" fill="currentColor" />
    <circle cx="7.5" cy="15" r="0.9" fill="currentColor" />
    <circle cx="12.5" cy="15" r="0.9" fill="currentColor" />
  </Icon>
);

export const ArrowLeftIcon = () => (
  <Icon>
    <path d="M16 10H4M9 5l-5 5 5 5" />
  </Icon>
);

export const ArrowRightIcon = () => (
  <Icon>
    <path d="M4 10h12M11 5l5 5-5 5" />
  </Icon>
);

export const PencilIcon = () => (
  <Icon>
    <path d="M13.5 3.5l3 3L7 16H4v-3z" />
  </Icon>
);

export const TrashIcon = () => (
  <Icon>
    <path d="M3.5 5.5h13M8 5.5V4h4v1.5M5.5 5.5l.8 10.5h7.4l.8-10.5" />
  </Icon>
);

export const CloseIcon = () => (
  <Icon>
    <path d="M5 5l10 10M15 5L5 15" />
  </Icon>
);

export const PlusIcon = () => (
  <Icon>
    <path d="M10 4v12M4 10h12" />
  </Icon>
);

export const SunIcon = () => (
  <Icon>
    <circle cx="10" cy="10" r="3.2" />
    <path d="M10 2.5v1.8M10 15.7v1.8M2.5 10h1.8M15.7 10h1.8M4.7 4.7l1.3 1.3M14 14l1.3 1.3M4.7 15.3L6 14M14 6l1.3-1.3" />
  </Icon>
);

export const MoonIcon = () => (
  <Icon>
    <path d="M16 12.2A6.5 6.5 0 017.8 4a6.5 6.5 0 108.2 8.2z" />
  </Icon>
);

export const PaletteIcon = () => (
  <Icon>
    <path d="M10 3a7 7 0 100 14c1 0 1.5-.7 1.5-1.4 0-1-1-1.3-1-2.2 0-.8.7-1.4 1.5-1.4h1.6A3.4 3.4 0 0017 8.6C17 5.5 13.9 3 10 3z" />
    <circle cx="6.5" cy="9" r="0.9" fill="currentColor" />
    <circle cx="9" cy="6" r="0.9" fill="currentColor" />
    <circle cx="12.6" cy="6.6" r="0.9" fill="currentColor" />
  </Icon>
);
