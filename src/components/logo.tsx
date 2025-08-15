import * as React from 'react';

export const Logo = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M16 16.42a8.94 8.94 0 0 1-8-3.42 9 9 0 0 1 7.13-7.13 9 9 0 0 1 8.87 8.87A8.94 8.94 0 0 1 16 16.42z" />
    <path d="m11.33 13.05 1.6-3.2-3.2 1.6" />
    <path d="M12 22a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" />
    <path d="M12 14v4" />
    <path d="M10 16h4" />
    <path d="M7 10a5 5 0 0 1 5-5" />
    <path d="M9 10a3 3 0 0 1 3-3" />
  </svg>
);
