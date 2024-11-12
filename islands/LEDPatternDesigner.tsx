import { useState, useRef, useEffect } from "preact/hooks";

const LEDPatternDesigner = () => {
  const [dimensions, setDimensions] = useState({
    leftWing: { width: 29, height: 8, x: 0, y: 0 },
    rightWing: { width: 29, height: 8, x: 30, y: 0 },
    // Center the tail sections by calculating x position based on wing width
    leftTail: { width: 9, height: 4, x: 20, y: 10 },  // Centered under left wing
    rightTail: { width: 9, height: 4, x: 30, y: 10 }, // Centered under right wing
  });

  // Modify initial patterns to use "0x0FFF" for white
  const [patterns, setPatterns] = useState({
    leftWing: Array(8)
      .fill()
      .map(() => Array(29).fill("0x0FFF")),
    rightWing: Array(8)
      .fill()
      .map(() => Array(29).fill("0x0FFF")),
    leftTail: Array(4)
      .fill()
      .map(() => Array(9).fill("0x0FFF")),
    rightTail: Array(4)
      .fill()
      .map(() => Array(9).fill("0x0FFF")),
  });

  const [activeColor, setActiveColor] = useState("#FFFFFF");
  const [error, setError] = useState("");
  const [imagePreview, setImagePreview] = useState(null);
  const [selectedSections, setSelectedSections] = useState({
    leftWing: true,
    rightWing: true,
    leftTail: true,
    rightTail: true,
  });
  const canvasRef = useRef(null);

  // Modify imagePosition to use relative values (percentages)
  const [imagePosition, setImagePosition] = useState({
    x: 50, // center position (0-100)
    y: 50, // center position (0-100)
    scale: 1,
    rotation: 0,
  });

  // Add state for tracking mouse dragging
  const [isDragging, setIsDragging] = useState(false);
  const [currentSection, setCurrentSection] = useState(null);

  // Add new state for grid justification
  const [gridJustification, setGridJustification] = useState({
    leftWing: 'right',
    rightWing: 'left',
    leftTail: 'right',
    rightTail: 'left',
  });

  const updateDimensions = (section, property, value) => {
    const numValue = parseInt(value);
    if (isNaN(numValue)) return;

    if (
      ["width", "height"].includes(property) &&
      (numValue < 1 || numValue > 100)
    ) {
      setError("Dimensions must be between 1 and 100");
      return;
    }
    setError("");

    setDimensions((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [property]: numValue,
      },
    }));

    // Modify updateDimensions to use "0x0FFF"
    if (["width", "height"].includes(property)) {
      setPatterns((prev) => {
        const newPattern = Array(
          property === "height" ? numValue : prev[section].length
        )
          .fill()
          .map(() =>
            Array(
              property === "width" ? numValue : prev[section][0].length
            ).fill("0x0FFF")
          );

        for (
          let i = 0;
          i < Math.min(newPattern.length, prev[section].length);
          i++
        ) {
          for (
            let j = 0;
            j < Math.min(newPattern[0].length, prev[section][0].length);
            j++
          ) {
            newPattern[i][j] = prev[section][i][j];
          }
        }

        return {
          ...prev,
          [section]: newPattern,
        };
      });
    }
  };

  // Modify handleColorCell to handle color conversion properly
  const handleColorCell = (section, row, col) => {
    let ledColor;
    if (activeColor.toUpperCase() === "#FFFFFF") {
      ledColor = "0x0FFF";
    } else {
      // Convert RGB color to 12-bit format
      const r = parseInt(activeColor.slice(1, 3), 16);
      const g = parseInt(activeColor.slice(3, 5), 16);
      const b = parseInt(activeColor.slice(5, 7), 16);
      ledColor = rgbToHex(r, g, b);
    }

    setPatterns((prev) => ({
      ...prev,
      [section]: prev[section].map((r, i) =>
        i === row
          ? r.map((j, index) => index === col ? ledColor : j)
          : r
      ),
    }));
  };

  // Modify rgbToHex to output 12-bit color format
  const rgbToHex = (r, g, b) => {
    // Check if the color is close to white
    if (r > 240 && g > 240 && b > 240) {
      return "0x0FFF";
    }

    // Convert to 4-bit color components (0-15)
    const r4 = Math.round((r / 255) * 15);
    const g4 = Math.round((g / 255) * 15);
    const b4 = Math.round((b / 255) * 15);
    
    // Combine into 12-bit color (4 bits each for R,G,B)
    const colorValue = (r4 << 8) | (g4 << 4) | b4;
    
    // Format as hex string with 0x prefix, ensuring 3 digits
    return `0x${colorValue.toString(16).padStart(3, '0').toUpperCase()}`;
  };

  // Add helper function to convert 12-bit color to RGB
  const convert12BitToRGB = (color) => {
    if (color === "0x0FFF") return "#FFFFFF";
    
    // Extract RGB components from 0xRGB format (remove "0x" prefix)
    const colorValue = parseInt(color.replace("0x", ""), 16);
    
    // Extract 4-bit components and convert to 8-bit
    const r = ((colorValue >> 8) & 0xF) * 17;
    const g = ((colorValue >> 4) & 0xF) * 17;
    const b = (colorValue & 0xF) * 17;
    
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  };

  const handleImageUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        setImagePreview(img);
        processImage(img);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  };

  // Add new helper function to calculate image bounds
  const calculateImageBounds = (img) => {
    const { scale, rotation } = imagePosition;
    const width = img.width * scale;
    const height = img.height * scale;
    
    // Calculate rotated dimensions
    const radians = (rotation * Math.PI) / 180;
    const rotatedWidth = Math.abs(width * Math.cos(radians)) + Math.abs(height * Math.sin(radians));
    const rotatedHeight = Math.abs(height * Math.cos(radians)) + Math.abs(width * Math.sin(radians));
    
    return { width: rotatedWidth, height: rotatedHeight };
  };

  // Add helper function to convert relative to absolute positions
  const getAbsolutePosition = (img) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    // Calculate base scale that makes image width match wing span at scale 1
    const wingSpan = getTotalWingSpan();
    const baseScale = wingSpan / img.width;
    const effectiveScale = baseScale * imagePosition.scale;

    return {
      x: (imagePosition.x / 100 * canvas.width) - (canvas.width / 2),
      y: (imagePosition.y / 100 * canvas.height) - (canvas.height / 2),
      scale: effectiveScale
    };
  };

  // Add helper to calculate total wing span
  const getTotalWingSpan = () => {
    const totalWidth = dimensions.leftWing.width + dimensions.rightWing.width;
    return totalWidth;
  };

  // Add a second canvas ref for image processing
  const processCanvasRef = useRef(null);

  // Update processImage function
  const processImage = (img) => {
    const canvas = processCanvasRef.current;
    const ctx = canvas.getContext("2d");
  
    // Set fixed canvas size based on LED layout
    const maxX = Math.max(
      ...Object.values(dimensions).map(d => d.x + d.width)
    );
    const maxY = Math.max(
      ...Object.values(dimensions).map(d => d.y + d.height)
    );
    
    canvas.width = maxX;
    canvas.height = maxY;
  
    // Clear canvas
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  
    // Calculate image scaling to fit the wing span
    const wingSpan = dimensions.leftWing.width + dimensions.rightWing.width;
    const scale = (wingSpan * imagePosition.scale) / img.width;
  
    // Draw image with transformations
    ctx.save();
    
    // Move to center of canvas
    ctx.translate(canvas.width / 2, canvas.height / 2);
    
    // Apply rotation
    ctx.rotate((imagePosition.rotation * Math.PI) / 180);
    
    // Apply scale
    ctx.scale(scale, scale);
    
    // Apply position offset
    const offsetX = ((imagePosition.x - 50) / 50) * canvas.width;
    const offsetY = ((imagePosition.y - 50) / 50) * canvas.height;
    ctx.translate(offsetX / scale, offsetY / scale);
    
    // Draw image centered
    ctx.drawImage(img, -img.width / 2, -img.height / 2);
    ctx.restore();
  
    // Update patterns based on pixel colors
    Object.entries(dimensions).forEach(([section, dims]) => {
      if (!selectedSections[section]) return;
  
      const newPattern = Array(dims.height)
        .fill()
        .map((_, row) =>
          Array(dims.width)
            .fill()
            .map((_, col) => {
              const x = dims.x + col;
              const y = dims.y + row;
              
              try {
                const pixelData = ctx.getImageData(x, y, 1, 1).data;
                if (pixelData[3] < 128) { // Check alpha channel
                  return "0x0FFF"; // Return white for transparent pixels
                }
                return rgbToHex(pixelData[0], pixelData[1], pixelData[2]);
              } catch (e) {
                return "0x0FFF"; // Return white for out of bounds
              }
            })
        );
  
      setPatterns(prev => ({
        ...prev,
        [section]: newPattern
      }));
    });
  };

  const generateCode = () => {
    const sections = ["leftWing", "rightWing", "leftTail", "rightTail"];
    let code = "#include <avr/pgmspace.h>\n#define PCOUNT 1\n\n";

    sections.forEach((section) => {
      const pattern = patterns[section];
      const totalSize = pattern.length * pattern[0].length;

      code += `const unsigned short\n    ${section}1[${totalSize}] PROGMEM =\n        {\n`;
      pattern.forEach((row, rowIndex) => {
        code += "         ";
        code += row.join(", ");
        code += ",\n";
      });
      code += "};\n\n";
    });

    code += "const unsigned short *leftTailBitmaps[] = {lefttail1};\n";
    code += "const unsigned short *rightTailBitmaps[] = {righttail1};\n";
    code += "const unsigned short *leftWingBitmaps[] = {leftwing1};\n";
    code += "const unsigned short *rightWingBitmaps[] = {rightwing1};\n";

    return code;
  };

  const downloadFile = () => {
    try {
      const code = generateCode();
      const blob = new Blob([code], { type: "text/plain;charset=utf-8" });
      const element = document.createElement("a");
      element.href = window.URL.createObjectURL(blob);
      element.download = "patterns.h";
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
      window.URL.revokeObjectURL(element.href);
    } catch (error) {
      console.error("Download failed:", error);
      setError("Failed to download file. Please try again.");
    }
  };

  // Modify renderSection to handle mouse events
  const renderSection = (section, title) => (
    <div className="border border-gray-200 p-4 rounded-lg">
      <h3 className="font-bold mb-2">{title}</h3>
      <div className="grid grid-cols-2 gap-2 mb-2">
        <div>
          <label className="block text-sm font-medium mb-1">Width</label>
          <input
            type="number"
            value={dimensions[section].width}
            onChange={(e) => updateDimensions(section, "width", e.target.value)}
            min="1"
            max="100"
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Height</label>
          <input
            type="number"
            value={dimensions[section].height}
            onChange={(e) =>
              updateDimensions(section, "height", e.target.value)
            }
            min="1"
            max="100"
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">X Position</label>
          <input
            type="number"
            value={dimensions[section].x}
            onChange={(e) => updateDimensions(section, "x", e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Y Position</label>
          <input
            type="number"
            value={dimensions[section].y}
            onChange={(e) => updateDimensions(section, "y", e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          />
        </div>
        <div className="col-span-2">
          <label className="block text-sm font-medium mb-1">Grid Alignment</label>
          <select
            value={gridJustification[section]}
            onChange={(e) => setGridJustification(prev => ({
              ...prev,
              [section]: e.target.value
            }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          >
            <option value="left">Left</option>
            <option value="center">Center</option>
            <option value="right">Right</option>
          </select>
        </div>
      </div>
      <div
        className="grid gap-1"
        style={{
          gridTemplateColumns: `repeat(${dimensions[section].width}, 1.1em)`,
          justifyContent: gridJustification[section] === 'right' ? 'end' : 
                         gridJustification[section] === 'center' ? 'center' : 'start'
        }}
        onMouseLeave={() => setIsDragging(false)}
      >
        {patterns[section].map((row, rowIndex) =>
          row.map((cell, colIndex) => (
            <div
              key={`${rowIndex}-${colIndex}`}
              className="w-5 h-5 border border-gray-300 cursor-pointer"
              style={{
                backgroundColor: convert12BitToRGB(cell),
              }}
              onMouseDown={(e) => {
                e.preventDefault(); // Prevent text selection while dragging
                setIsDragging(true);
                setCurrentSection(section);
                handleColorCell(section, rowIndex, colIndex);
              }}
              onMouseEnter={() => {
                if (isDragging && currentSection === section) {
                  handleColorCell(section, rowIndex, colIndex);
                }
              }}
              onMouseUp={() => {
                setIsDragging(false);
                setCurrentSection(null);
              }}
            />
          ))
        )}
      </div>
    </div>
  );

  // Add global mouse up handler to stop dragging
  useEffect(() => {
    const handleMouseUp = () => {
      setIsDragging(false);
      setCurrentSection(null);
    };

    window.addEventListener('mouseup', handleMouseUp);
    return () => window.removeEventListener('mouseup', handleMouseUp);
  }, []);

  // Update renderImageControls with relative values
  const renderImageControls = () => (
    <div className="mb-6">
      <h3 className="font-bold mb-2">Image Position Controls</h3>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">X Position ({imagePosition.x}%)</label>
          <input
            type="range"
            min={0}
            max={100}
            value={imagePosition.x}
            onChange={(e) => {
              setImagePosition(prev => ({...prev, x: parseInt(e.target.value)}));
              if (imagePreview) processImage(imagePreview);
            }}
            className="w-full"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Y Position ({imagePosition.y}%)</label>
          <input
            type="range"
            min={0}
            max={100}
            value={imagePosition.y}
            onChange={(e) => {
              setImagePosition(prev => ({...prev, y: parseInt(e.target.value)}));
              if (imagePreview) processImage(imagePreview);
            }}
            className="w-full"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">
            Scale ({(imagePosition.scale).toFixed(2)}x wing span)
          </label>
          <input
            type="range"
            min={0.1}
            max={2}
            step={0.05}
            value={imagePosition.scale}
            onChange={(e) => {
              setImagePosition(prev => ({...prev, scale: parseFloat(e.target.value)}));
              if (imagePreview) processImage(imagePreview);
            }}
            className="w-full"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Rotation ({imagePosition.rotation}°)</label>
          <input
            type="range"
            min={-180}
            max={180}
            value={imagePosition.rotation}
            onChange={(e) => {
              setImagePosition(prev => ({...prev, rotation: parseInt(e.target.value)}));
              if (imagePreview) processImage(imagePreview);
            }}
            className="w-full"
          />
        </div>
      </div>
    </div>
  );

  return (
    <div className="container mx-auto px-4 py-8">
      <canvas
        ref={processCanvasRef}
        style={{ display: 'none' }}
        width={1000}
        height={1000}
      />
      <div className="card">
        <div className="card-body">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}
          
          <div className="grid-2-cols mb-6">
            {/* Color and Image Controls */}
            <div className="control-group">
              <h3 className="control-group-title">Design Tools</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700">Paint Color</label>
                  <input
                    type="color"
                    value={activeColor}
                    onChange={(e) => setActiveColor(e.target.value)}
                    className="w-full h-12 rounded-md shadow-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700">Upload Image</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="w-full text-sm text-gray-500
                      file:mr-4 file:py-2 file:px-4
                      file:rounded-full file:border-0
                      file:text-sm file:font-semibold
                      file:bg-blue-50 file:text-blue-700
                      hover:file:bg-blue-100"
                  />
                </div>
              </div>
            </div>

            {/* Section Selection */}
            <div className="control-group">
              <h3 className="control-group-title">Active Sections</h3>
              <div className="grid-2-cols">
                {Object.entries(selectedSections).map(([section, checked]) => (
                  <div key={section} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id={section}
                      checked={checked}
                      onChange={(e) =>
                        setSelectedSections((prev) => ({
                          ...prev,
                          [section]: e.target.checked,
                        }))
                      }
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor={section} className="text-sm text-gray-700">
                      {section.replace(/([A-Z])/g, ' $1').trim()}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Image Preview and Controls */}
          {imagePreview && (
            <div className="control-group">
              <div className="flex items-start gap-6">
                <div className="w-48 shrink-0">
                  <img
                    src={imagePreview.src}
                    alt="Preview"
                    className="w-full rounded-lg border border-gray-200"
                  />
                </div>
                {renderImageControls()}
              </div>
            </div>
          )}

          {/* LED Pattern Grids */}
          <div className="grid-2-cols mb-6">
            {renderSection("leftWing", "Left Wing")}
            {renderSection("rightWing", "Right Wing")}
          </div>
          <div className="grid-2-cols mb-6">
            {renderSection("leftTail", "Left Tail")}
            {renderSection("rightTail", "Right Tail")}
          </div>

          {/* Export Controls */}
          <div className="control-group">
            <h3 className="control-group-title">Export Pattern</h3>
            <button
              onClick={downloadFile}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-4 rounded-md transition duration-150 ease-in-out"
            >
              Download patterns.h
            </button>
            
            <div className="mt-6">
              <label className="block text-sm font-medium mb-2 text-gray-700">
                Code Preview:
              </label>
              <pre className="mt-2 p-4 bg-gray-100 rounded-md overflow-x-auto text-sm">
                {generateCode()}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LEDPatternDesigner;
