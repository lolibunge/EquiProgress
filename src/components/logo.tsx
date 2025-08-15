import * as React from 'react';

export const Logo = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M12 12m-2 0a2 2 0 1 0 4 0a2 2 0 1 0-4 0" />
    <path d="M21 12c-1.884-3.13-4.28-5.523-7.17-7.168" />
    <path d="M3 12c1.884 3.13 4.28 5.523 7.17 7.168" />
  </svg>
);
