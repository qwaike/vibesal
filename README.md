# Bureaucratic Office RPG

A unique Three.js-based game where you navigate through an office environment, engaging in document-throwing and stamp-based combat while managing your bureaucratic career.

## Features

- First/third-person perspective office exploration
- Document-throwing combat system
- Stamp-based special abilities
- Career progression system
- Dynamic office environment with interactive elements
- Ambient sound effects and background music
- Debug mode for development

## Controls

- **WASD**: Move around the office
- **Mouse**: Look around
- **Shift**: Run
- **Tab**: Toggle between first/third person view
- **Left Click**: Throw documents
- **Right Click**: Use stamps
- **E**: Interact with objects
- **F3**: Toggle debug mode
- **Escape**: Exit pointer lock
- **M**: Toggle sound mute

## Setup

1. Clone the repository:
```bash
git clone https://github.com/yourusername/bureaucratic-office-rpg.git
cd bureaucratic-office-rpg
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm start
```

4. Open your browser and navigate to `http://localhost:3000`

## Development

The game is built using:
- Three.js for 3D rendering
- Web Audio API for sound effects
- Modern JavaScript (ES6+)

### Project Structure

```
bureaucratic-office-rpg/
├── index.html
├── js/
│   ├── Game.js
│   ├── Player.js
│   ├── Office.js
│   ├── Combat.js
│   ├── Audio.js
│   └── main.js
├── sounds/
│   ├── document_throw.mp3
│   ├── document_hit.mp3
│   ├── stamp_use.mp3
│   ├── stamp_hit.mp3
│   ├── footstep.mp3
│   ├── water_cooler.mp3
│   ├── paper_rustle.mp3
│   ├── promotion.mp3
│   ├── combat_start.mp3
│   ├── combat_end.mp3
│   └── office_ambience.mp3
└── README.md
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Three.js community for the excellent 3D graphics library
- Sound effects from [source]
- Background music from [source] 