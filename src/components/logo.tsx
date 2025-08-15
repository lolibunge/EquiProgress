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
    <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Z" />
    <path d="M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z" />
    <path d="M12 12a5 5 0 1 1 0 10 5 5 0 0 1 0-10Z" />
  </svg>
);
