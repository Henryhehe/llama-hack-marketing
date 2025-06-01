import React, { useState } from "react";
import { Upload, Video, Loader2, Plus, X } from "lucide-react";

export const VideoGenerator = () => {
  const [formData, setFormData] = useState({
    productDescription: "",
    keyFeatures: [""],
    customerInfo: "",
    style: "professional",
  });
  const [images, setImages] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState(null);
  const [script, setScript] = useState(null);
  const [editedScript, setEditedScript] = useState("");
  const [additionalSuggestions, setAdditionalSuggestions] = useState("");
  const [isGeneratingScript, setIsGeneratingScript] = useState(false);

  const addFeature = () => {
    setFormData((prev) => ({
      ...prev,
      keyFeatures: [...prev.keyFeatures, ""],
    }));
  };

  const updateFeature = (index, value) => {
    const newFeatures = [...formData.keyFeatures];
    newFeatures[index] = value;
    setFormData((prev) => ({ ...prev, keyFeatures: newFeatures }));
  };

  const removeFeature = (index) => {
    setFormData((prev) => ({
      ...prev,
      keyFeatures: prev.keyFeatures.filter((_, i) => i !== index),
    }));
  };

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    const imageUrls = files.map((file) => ({
      file,
      url: URL.createObjectURL(file),
      name: file.name,
    }));
    setImages((prev) => [...prev, ...imageUrls]);
  };

  const removeImage = (index) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const generateScript = async () => {
    if (!formData.productDescription.trim()) {
      alert("Please enter a product description");
      return;
    }

    setIsGeneratingScript(true);
    try {
      const response = await fetch(
        "http://localhost:8000/api/generate-script",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            product_description: formData.productDescription,
            key_features: formData.keyFeatures.filter((f) => f.trim()),
            customer_info: formData.customerInfo,
            style: formData.style,
          }),
        }
      );

      if (response.ok) {
        const result = await response.json();
        setScript(result.script);
        setEditedScript(result.script);
      } else {
        throw new Error("Failed to generate script");
      }
    } catch (error) {
      console.error("Error:", error);
      alert("Failed to generate script. Please try again.");
    } finally {
      setIsGeneratingScript(false);
    }
  };

  const regenerateScript = async () => {
    if (!formData.productDescription.trim()) {
      alert("Please enter a product description");
      return;
    }

    setIsGeneratingScript(true);
    try {
      const response = await fetch(
        "http://localhost:8000/api/generate-script",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            product_description: formData.productDescription,
            key_features: formData.keyFeatures.filter((f) => f.trim()),
            customer_info: formData.customerInfo,
            style: formData.style,
            additional_suggestions: additionalSuggestions,
          }),
        }
      );

      if (response.ok) {
        const result = await response.json();
        setScript(result.script);
        setEditedScript(result.script);
      } else {
        throw new Error("Failed to regenerate script");
      }
    } catch (error) {
      console.error("Error:", error);
      alert("Failed to regenerate script. Please try again.");
    } finally {
      setIsGeneratingScript(false);
    }
  };

  const generateVideo = async () => {
    if (!formData.productDescription.trim()) {
      alert("Please enter a product description");
      return;
    }

    setIsGenerating(true);
    try {
      // First upload images if any
      let uploadedImages = [];
      if (images.length > 0) {
        const formDataImages = new FormData();
        images.forEach((img) => formDataImages.append("files", img.file));

        const uploadResponse = await fetch(
          "http://localhost:8000/api/upload-images",
          {
            method: "POST",
            body: formDataImages,
          }
        );

        if (uploadResponse.ok) {
          const uploadResult = await uploadResponse.json();
          uploadedImages = uploadResult.uploaded_files;
        }
      }

      // Generate video using the script
      const response = await fetch("http://localhost:8000/api/generate-video", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          script: editedScript,
          images: uploadedImages.map((img) => img.path) || [],
        }),
      });

      if (response.ok) {
        const result = await response.json();
        setResult(result);
      } else {
        throw new Error("Failed to generate video");
      }
    } catch (error) {
      console.error("Error:", error);
      alert("Failed to generate video. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            AI Video Generator
          </h1>
          <p className="text-gray-600">
            Create stunning product videos with AI
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Input Form */}
          <div className="bg-white rounded-2xl shadow-xl p-6">
            <h2 className="text-2xl font-semibold mb-6 text-gray-800">
              Project Details
            </h2>

            {/* Product Description */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Product Description *
              </label>
              <textarea
                value={formData.productDescription}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    productDescription: e.target.value,
                  }))
                }
                placeholder="Describe your product..."
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                rows="3"
              />
            </div>

            {/* Key Features */}
            <div className="mb-6">
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Key Features
                </label>
                <button
                  onClick={addFeature}
                  className="text-blue-600 hover:text-blue-800 flex items-center gap-1 text-sm"
                >
                  <Plus size={16} /> Add Feature
                </button>
              </div>
              {formData.keyFeatures.map((feature, index) => (
                <div key={index} className="flex gap-2 mb-2">
                  <input
                    value={feature}
                    onChange={(e) => updateFeature(index, e.target.value)}
                    placeholder={`Feature ${index + 1}`}
                    className="flex-1 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  {formData.keyFeatures.length > 1 && (
                    <button
                      onClick={() => removeFeature(index)}
                      className="text-red-500 hover:text-red-700 p-2"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Customer Info */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Target Audience
              </label>
              <input
                value={formData.customerInfo}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    customerInfo: e.target.value,
                  }))
                }
                placeholder="Who is this for? (optional)"
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Style Selection */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Video Style
              </label>
              <select
                value={formData.style}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, style: e.target.value }))
                }
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="professional">Professional</option>
                <option value="casual">Casual</option>
                <option value="energetic">Energetic</option>
                <option value="minimal">Minimal</option>
              </select>
            </div>

            {/* Image Upload */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Product Images
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                  id="image-upload"
                />
                <label htmlFor="image-upload" className="cursor-pointer">
                  <Upload className="mx-auto mb-2 text-gray-400" size={24} />
                  <p className="text-gray-600">Click to upload images</p>
                </label>
              </div>

              {images.length > 0 && (
                <div className="mt-4 grid grid-cols-3 gap-2">
                  {images.map((img, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={img.url}
                        alt={img.name}
                        className="w-full h-20 object-cover rounded-lg"
                      />
                      <button
                        onClick={() => removeImage(index)}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Generate Script Button */}
            <button
              onClick={generateScript}
              disabled={
                isGeneratingScript || !formData.productDescription.trim()
              }
              className="w-full bg-gradient-to-r from-green-600 to-teal-600 text-white py-3 px-6 rounded-lg font-semibold hover:from-green-700 hover:to-teal-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all mb-4"
            >
              {isGeneratingScript ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  Generating Script...
                </>
              ) : (
                <>
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  Generate Script
                </>
              )}
            </button>

            {/* Generate Video Button */}
            <button
              onClick={generateVideo}
              disabled={isGenerating || !editedScript}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-6 rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  Generating Video...
                </>
              ) : (
                <>
                  <Video size={20} />
                  Generate Video
                </>
              )}
            </button>
          </div>

          {/* Result Panel */}
          <div className="bg-white rounded-2xl shadow-xl p-6">
            <h2 className="text-2xl font-semibold mb-6 text-gray-800">
              Generated Content
            </h2>

            {!result && !script && !isGenerating && !isGeneratingScript && (
              <div className="text-center text-gray-500 py-12">
                <Video size={48} className="mx-auto mb-4 opacity-50" />
                <p>Generate a script first, then create your video</p>
              </div>
            )}

            {(isGeneratingScript || isGenerating) && (
              <div className="text-center py-12">
                <Loader2
                  className="animate-spin mx-auto mb-4 text-blue-600"
                  size={48}
                />
                <p className="text-gray-600">
                  {isGeneratingScript
                    ? "Creating your script..."
                    : "Creating your video..."}
                </p>
                <p className="text-sm text-gray-500 mt-2">
                  This may take a few moments
                </p>
              </div>
            )}

            {script && !result && (
              <div className="space-y-6">
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="font-semibold text-gray-800">
                      Generated Script
                    </h3>
                    <div className="flex gap-2">
                      <button
                        onClick={regenerateScript}
                        disabled={isGeneratingScript}
                        className="text-sm bg-yellow-500 text-white px-3 py-1 rounded-lg hover:bg-yellow-600 disabled:opacity-50 flex items-center gap-1"
                      >
                        {isGeneratingScript ? (
                          <Loader2 className="animate-spin" size={12} />
                        ) : (
                          <svg
                            className="w-3 h-3"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                            />
                          </svg>
                        )}
                        Regenerate
                      </button>
                    </div>
                  </div>

                  {/* Additional Suggestions Input */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Additional Suggestions (for regeneration)
                    </label>
                    <textarea
                      value={additionalSuggestions}
                      onChange={(e) => setAdditionalSuggestions(e.target.value)}
                      placeholder="Add any specific requirements or changes you'd like in the script..."
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                      rows="2"
                    />
                  </div>

                  {/* Editable Script */}
                  <div className="bg-gray-50 rounded-lg border">
                    <div className="bg-gray-100 px-4 py-2 rounded-t-lg border-b">
                      <span className="text-sm font-medium text-gray-600">
                        Script Editor (Click to edit)
                      </span>
                    </div>
                    <textarea
                      value={editedScript}
                      onChange={(e) => setEditedScript(e.target.value)}
                      className="w-full p-4 bg-transparent border-none focus:ring-0 focus:outline-none resize-none font-mono text-sm"
                      rows="12"
                      placeholder="Your script will appear here..."
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <p className="text-sm text-green-600">
                      ✅ Script ready! Edit if needed, then generate video.
                    </p>
                    <div className="text-xs text-gray-500">
                      {editedScript !== script && (
                        <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded">
                          Modified
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {result && (
              <div className="space-y-6">
                {/* Generated Script */}
                <div>
                  <h3 className="font-semibold text-gray-800 mb-3">
                    Generated Script
                  </h3>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <pre className="whitespace-pre-wrap text-sm text-gray-700 font-mono">
                      {result.script}
                    </pre>
                  </div>
                </div>

                {/* Video Preview */}
                <div>
                  <h3 className="font-semibold text-gray-800 mb-3">
                    Video Preview
                  </h3>
                  <div className="bg-gradient-to-br from-blue-100 to-purple-100 rounded-lg p-8 text-center">
                    <Video size={48} className="mx-auto mb-4 text-blue-600" />
                    <p className="text-gray-700 mb-4">
                      Video generated successfully!
                    </p>
                    <p className="text-sm text-gray-600">
                      URL: {result.hosted_url}
                    </p>
                    <button className="mt-4 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                      Download Video
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
