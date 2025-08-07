# Windows Setup Guide for SensAI

This guide provides instructions for setting up the SensAI project on Windows systems.

## Prerequisites

- Python 3.12 or higher
- pip (Python package installer)
- Git

## Installation

### 1. Clone the Repository
```bash
git clone <repository-url>
cd sensai-ai
```

### 2. Install Dependencies

**For Production:**
```bash
pip install -r requirements-windows.txt
```

**For Development:**
```bash
pip install -r requirements-dev-windows.txt
```

## Windows-Specific Notes

### Key Differences from Original Requirements

The Windows-compatible requirements files have been modified to address platform-specific issues:

1. **uvloop Removed**: The `uvloop` package (version 0.21.0) has been removed from the Windows requirements as it doesn't support Windows. This package is used for high-performance async I/O on Unix-like systems.

2. **Alternative Event Loop**: On Windows, the standard asyncio event loop will be used instead of uvloop. While this may result in slightly lower performance for high-concurrency scenarios, it ensures compatibility with Windows systems.

### Files Created

- `requirements-windows.txt`: Windows-compatible production dependencies
- `requirements-dev-windows.txt`: Windows-compatible development dependencies
- `README-WINDOWS.md`: This documentation file

### Performance Considerations

- The application will use the standard asyncio event loop instead of uvloop
- For most use cases, the performance difference is negligible
- If you need maximum performance, consider running the application in a Linux environment or WSL (Windows Subsystem for Linux)

## Running the Application

After installing the dependencies, you can run the application using the standard commands:

```bash
# For FastAPI server
uvicorn src.main:app --reload

# For Streamlit app (if applicable)
streamlit run src/streamlit_app.py
```

## Troubleshooting

### Common Issues

1. **uvloop Import Errors**: If you see import errors related to uvloop, make sure you're using the Windows requirements files.

2. **Package Installation Failures**: Some packages may require Visual C++ build tools. Install them from Microsoft's official website if needed.

3. **Path Issues**: Ensure your Python environment is properly configured and in your PATH.

### Getting Help

If you encounter issues not covered in this guide:
1. Check the main README.md for general setup instructions
2. Review the original requirements.txt to understand what packages are needed
3. Consider using WSL (Windows Subsystem for Linux) for a more Unix-like development environment

## Contributing

When contributing to this project on Windows:
1. Use the Windows requirements files for development
2. Test your changes on both Windows and Unix-like systems if possible
3. Update this README if you discover additional Windows-specific considerations
