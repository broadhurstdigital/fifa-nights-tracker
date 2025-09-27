import React, { useState } from 'react';
import type { SeasonWithStats } from '@/types';
import SeasonList from './SeasonList';
import SeasonDetail from './SeasonDetail';

const SeasonManagement: React.FC = () => {
  const [selectedSeason, setSelectedSeason] = useState<SeasonWithStats | null>(null);

  if (selectedSeason) {
    return (
      <SeasonDetail 
        season={selectedSeason} 
        onBack={() => setSelectedSeason(null)} 
      />
    );
  }

  return <SeasonList onSeasonSelect={setSelectedSeason} />;
};

export default SeasonManagement;