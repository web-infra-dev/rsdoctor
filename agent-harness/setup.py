from setuptools import setup, find_namespace_packages

setup(
    name="cli-anything-rsdoctor",
    version="0.1.0",
    description="CLI harness for the rsdoctor build analyzer (webpack/rspack)",
    long_description=open("cli_anything/rsdoctor/README.md", encoding="utf-8").read(),
    long_description_content_type="text/markdown",
    author="cli-anything-rsdoctor contributors",
    python_requires=">=3.8",
    packages=find_namespace_packages(include=["cli_anything.*"]),
    install_requires=[
        "click>=8.0",
        "tabulate>=0.9",
        "requests>=2.28",
    ],
    extras_require={
        "dev": [
            "pytest>=7.0",
        ]
    },
    entry_points={
        "console_scripts": [
            "cli-anything-rsdoctor=cli_anything.rsdoctor.rsdoctor_cli:cli",
        ]
    },
    classifiers=[
        "Development Status :: 3 - Alpha",
        "Intended Audience :: Developers",
        "Topic :: Software Development :: Build Tools",
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.8",
        "Programming Language :: Python :: 3.9",
        "Programming Language :: Python :: 3.10",
        "Programming Language :: Python :: 3.11",
        "Programming Language :: Python :: 3.12",
        "License :: OSI Approved :: MIT License",
        "Operating System :: OS Independent",
    ],
)
