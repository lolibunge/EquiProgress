// src/app/session/[id]/page.tsx

"use client"; // Add this line

import { useParams } from 'next/navigation';

const SessionInputPage = () => {
  const { id } = useParams();

  return (
    <div>
      Session Input for ID: {id}
    </div>
  );
};

export default SessionInputPage;
