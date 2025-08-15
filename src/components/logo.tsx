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
    <path d="M3.5 10C5.5 6.5 9.5 4 14 4C19.5 4 22 8 22 12C22 18 18 22 12 22C6 22 2 18 2 12C2 11 2.2 10 2.5 9" />
    <path d="M14 4C13.5 6 13 8.5 12.5 11C12 13.5 11.5 15.5 11 17" />
    <path d="M9.5 15c-1-1-1.5-2.5-1-4C9 9 10 7.5 11.5 6.5" />
  </svg>
);
