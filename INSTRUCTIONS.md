# Mera OS — Project Instructions

## About This Project
Mera OS is an operating system development project focused on core architecture and kernel implementation. This is the primary flagship project.

## Project Status
- **Current Phase**: In Progress
- **Progress**: 65%
- **Priority**: High
- **Target Deadline**: June 30, 2026

## Objectives
1. Design and implement core OS kernel architecture
2. Build system-level services and drivers
3. Develop user interface layer
4. Create documentation and developer tools
5. Testing and stability improvements

## Key Milestones
- [ ] Kernel core complete
- [ ] Memory management system
- [ ] Process scheduler
- [ ] File system implementation
- [ ] Device driver framework
- [ ] User interface shell
- [ ] Beta testing phase
- [ ] Documentation complete

## Development Devices
- **Laptop**: Primary development environment
- **Mac Mini (Studio)**: Build server / secondary development
- **Android Tablet**: Code review and monitoring

## Cowork Task Guidelines
When working on this project, Claude should:
- Always check for existing files before creating new ones
- Follow the existing code style and conventions in the project
- Create backups before making significant changes
- Update the changelog when making modifications
- Run tests after changes when test scripts are available
- Keep documentation in sync with code changes

## Folder Structure (Expected)
```
mera-os/
├── src/              # Source code
├── docs/             # Documentation
├── tests/            # Test files
├── config/           # Configuration files
├── build/            # Build output
├── scripts/          # Build and utility scripts
├── CHANGELOG.md      # Change log
├── README.md         # Project readme
└── INSTRUCTIONS.md   # This file (Cowork context)
```

## Notes
- This is the most complex of the 4 projects
- Coordinate with Anak Buah project for team management integration
- Keep kernel modules modular for easier testing
