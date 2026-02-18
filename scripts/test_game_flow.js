#!/usr/bin/env node

/**
 * Automated test for Phase 5 - Draft Screen
 * Tests the complete game flow via API calls
 */

const API_BASE = 'http://localhost:8000/api';

async function testGameFlow() {
  console.log('🧪 Testing Phase 5 - Draft Screen\n');

  try {
    // Test 1: Get Templates
    console.log('📋 Test 1: Fetching templates...');
    const templatesRes = await fetch(`${API_BASE}/templates/`);
    const templates = await templatesRes.json();
    console.log(`✅ Found ${templates.length} template(s)`);
    if (templates.length === 0) {
      throw new Error('No templates found!');
    }
    const template = templates[0];
    console.log(`   Using template: "${template.name}" with ${template.roles.length} roles\n`);

    // Test 2: Get Anime
    console.log('🎬 Test 2: Fetching anime...');
    const animeRes = await fetch(`${API_BASE}/anime/`);
    const anime = await animeRes.json();
    console.log(`✅ Found ${anime.length} anime\n`);
    if (anime.length === 0) {
      throw new Error('No anime found!');
    }

    // Test 3: Get Characters
    console.log('👥 Test 3: Fetching characters...');
    const animeIds = anime.map(a => a.id).join(',');
    const charsRes = await fetch(`${API_BASE}/characters/?anime_ids=${animeIds}`);
    const characters = await charsRes.json();
    console.log(`✅ Found ${characters.length} character(s)\n`);
    if (characters.length === 0) {
      throw new Error('No characters found!');
    }

    // Test 4: Draw Characters
    console.log('🎲 Test 4: Drawing characters...');
    const remainingIds = characters.map(c => c.id);
    const rolesPerPlayer = template.roles.length;
    const totalDraws = rolesPerPlayer * 2; // 2 players

    console.log(`   Need to draw ${totalDraws} characters for ${rolesPerPlayer} roles per player`);

    const player1Assignments = {};
    const player2Assignments = {};
    let currentTurn = 1;
    let remaining = [...remainingIds];
    let drawCount = 0;

    // Calculate rating tier
    function calculateRating(character, pool) {
      const drawScore = character.character_power * character.anime_power_scale;
      const allScores = pool.map(c => c.character_power * c.anime_power_scale).sort((a, b) => a - b);
      const rank = allScores.filter(s => s < drawScore).length;
      const percentile = (rank / allScores.length) * 100;

      let tier;
      if (percentile >= 90) tier = 'S';
      else if (percentile >= 70) tier = 'A';
      else if (percentile >= 40) tier = 'B';
      else if (percentile >= 10) tier = 'C';
      else tier = 'D';

      return { tier, percentile: percentile.toFixed(1) };
    }

    while (drawCount < totalDraws && remaining.length > 0) {
      // Draw a character
      const drawRes = await fetch(`${API_BASE}/draw/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ remainingCharacterIds: remaining })
      });

      const drawData = await drawRes.json();
      const drawnChar = drawData.character;
      const rating = calculateRating(drawnChar, characters);

      drawCount++;
      const roleIndex = Math.floor((drawCount - 1) / 2) % rolesPerPlayer;
      const role = template.roles[roleIndex];

      // Assign to player
      if (currentTurn === 1) {
        player1Assignments[role] = drawnChar;
      } else {
        player2Assignments[role] = drawnChar;
      }

      // Remove from remaining
      remaining = remaining.filter(id => id !== drawnChar.id);

      console.log(`   Draw ${drawCount}/${totalDraws}: Player ${currentTurn} got ${drawnChar.name} (${drawnChar.anime.name}) - Tier ${rating.tier} [${rating.percentile}%] for ${role}`);

      // Switch turn
      currentTurn = currentTurn === 1 ? 2 : 1;
    }

    console.log(`\n✅ Successfully drew all ${totalDraws} characters!\n`);

    // Test 5: Calculate Score
    console.log('🏆 Test 5: Calculating final score...');

    const leftTeam = Object.entries(player1Assignments).map(([role, char]) => ({
      role,
      characterId: char.id
    }));

    const rightTeam = Object.entries(player2Assignments).map(([role, char]) => ({
      role,
      characterId: char.id
    }));

    const scoreRes = await fetch(`${API_BASE}/score/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        templateId: template.id,
        leftTeam: { assignments: leftTeam },
        rightTeam: { assignments: rightTeam }
      })
    });

    const scoreData = await scoreRes.json();

    console.log(`   Player 1 Total Score: ${scoreData.leftTeam.total}`);
    console.log(`   Player 2 Total Score: ${scoreData.rightTeam.total}`);
    console.log(`   Winner: ${scoreData.winner === 'left' ? 'Player 1' : scoreData.winner === 'right' ? 'Player 2' : 'Draw'}\n`);

    console.log('✅ All tests passed successfully! 🎉\n');
    console.log('📝 Summary:');
    console.log(`   - Templates: ${templates.length}`);
    console.log(`   - Anime: ${anime.length}`);
    console.log(`   - Characters: ${characters.length}`);
    console.log(`   - Characters drawn: ${totalDraws}`);
    console.log(`   - Winner: ${scoreData.winner === 'left' ? 'Player 1' : scoreData.winner === 'right' ? 'Player 2' : 'Draw'}`);

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

// Run tests
testGameFlow();
