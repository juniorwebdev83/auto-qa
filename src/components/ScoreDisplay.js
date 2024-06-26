import React from 'react';

function ScoreDisplay({ score, breakdown }) {
  return (
    <div>
      <h2>QA Score</h2>
      <p>Total Score: {score.toFixed(2)} / 60</p>
      <h3>Score Breakdown:</h3>
      <ul>
        {breakdown.map((item, index) => (
          <li key={index}>
            {item.criterion}: {item.score} / {item.maxScore}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default ScoreDisplay;