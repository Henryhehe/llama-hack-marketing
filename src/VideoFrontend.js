import React, { useState } from "react";
import {
  Upload,
  Video,
  Loader2,
  Plus,
  X,
  Link,
  Search,
  Sparkles,
  Zap,
  Star,
} from "lucide-react";

export const VideoGenerator = () => {
  const [formData, setFormData] = useState({
    productDescription: "",
    keyFeatures: [""],
    customerInfo: "",
    style: "professional",
  });
  const [productUrl, setProductUrl] = useState("");
  const [isExtractingDetails, setIsExtractingDetails] = useState(false);
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

  const extractProductDetails = async () => {
    if (!productUrl.trim()) {
      alert("Please enter a product URL");
      return;
    }

    setIsExtractingDetails(true);
    try {
      const response = await fetch(
        "http://localhost:8000/api/extract-product-details",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            url: productUrl,
          }),
        }
      );

      if (response.ok) {
        const result = await response.json();

        setFormData((prev) => ({
          ...prev,
          productDescription:
            result.product_description || prev.productDescription,
          keyFeatures:
            result.key_features && result.key_features.length > 0
              ? result.key_features
              : prev.keyFeatures,
          customerInfo: result.target_audience || prev.customerInfo,
        }));

        if (result.product_images && result.product_images.length > 0) {
          const imageObjects = result.product_images.map((imageUrl, index) => ({
            file: null,
            url: imageUrl,
            name: `Product Image ${index + 1}`,
            isFromUrl: true,
          }));
          setImages((prev) => [...prev, ...imageObjects]);
        }

        alert("Product details extracted successfully!");
      } else {
        const errorData = await response.json();
        throw new Error(
          errorData.detail || "Failed to extract product details"
        );
      }
    } catch (error) {
      console.error("Error:", error);
      alert(`Failed to extract product details: ${error.message}`);
    } finally {
      setIsExtractingDetails(false);
    }
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
      let uploadedImages = [];
      const fileImages = images.filter((img) => img.file && !img.isFromUrl);

      if (fileImages.length > 0) {
        const formDataImages = new FormData();
        fileImages.forEach((img) => formDataImages.append("files", img.file));

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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute top-3/4 right-1/4 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl animate-pulse delay-2000"></div>
      </div>

      {/* Floating Particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-blue-400/20 rounded-full animate-ping"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${2 + Math.random() * 3}s`,
            }}
          ></div>
        ))}
      </div>

      <div className="relative z-10 p-6">
        <div className="max-w-7xl mx-auto">
          {/* Hero Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-3 mb-6">
              <div className="relative">
                <Sparkles className="text-cyan-400 animate-pulse" size={32} />
                <div className="absolute inset-0 blur-sm">
                  <Sparkles className="text-cyan-400" size={32} />
                </div>
              </div>
              <h1 className="text-6xl font-bold bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
                Lumina
              </h1>
              <div className="relative">
                <Star className="text-purple-400 animate-pulse" size={28} />
                <div className="absolute inset-0 blur-sm">
                  <Star className="text-purple-400" size={28} />
                </div>
              </div>
            </div>
            <p className="text-xl text-slate-300 mb-4 font-light">
              Illuminate Your Marketing with Personalized AI Videos
            </p>
            <p className="text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
              Lumina helps you shine a light on your marketing goals with
              personalized AI videos that captivate your audience and drive real
              results.
            </p>
          </div>

          <div className="grid xl:grid-cols-2 gap-8">
            {/* Input Form */}
            <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl shadow-2xl p-8 hover:bg-white/15 transition-all duration-500">
              <div className="flex items-center gap-3 mb-8">
                <Zap className="text-cyan-400" size={28} />
                <h2 className="text-3xl font-bold text-white">Create Magic</h2>
              </div>

              {/* Product URL Input */}
              <div className="mb-8">
                <label className="block text-sm font-semibold text-slate-200 mb-3">
                  Product URL
                </label>
                <div className="flex gap-3">
                  <div className="relative flex-1">
                    <Link
                      className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400"
                      size={20}
                    />
                    <input
                      value={productUrl}
                      onChange={(e) => setProductUrl(e.target.value)}
                      placeholder="https://example.com/product-page"
                      className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/20 backdrop-blur-sm rounded-2xl text-white placeholder-slate-400 focus:ring-2 focus:ring-cyan-400/50 focus:border-cyan-400/50 transition-all"
                    />
                  </div>
                  <button
                    onClick={extractProductDetails}
                    disabled={isExtractingDetails || !productUrl.trim()}
                    className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white px-6 py-4 rounded-2xl font-semibold hover:from-cyan-400 hover:to-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-all transform hover:scale-105 whitespace-nowrap shadow-lg"
                  >
                    {isExtractingDetails ? (
                      <>
                        <Loader2 className="animate-spin" size={18} />
                        Extracting...
                      </>
                    ) : (
                      <>
                        <Search size={18} />
                        Extract
                      </>
                    )}
                  </button>
                </div>
                <p className="text-xs text-slate-400 mt-2">
                  Automatically extract product details from any URL
                </p>
              </div>

              {/* Divider */}
              <div className="flex items-center my-8">
                <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
                <span className="px-4 text-sm text-slate-300 font-medium">
                  OR ENTER MANUALLY
                </span>
                <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
              </div>

              {/* Product Description */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-slate-200 mb-3">
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
                  placeholder="Describe your amazing product..."
                  className="w-full p-4 bg-white/5 border border-white/20 backdrop-blur-sm rounded-2xl text-white placeholder-slate-400 focus:ring-2 focus:ring-cyan-400/50 focus:border-cyan-400/50 transition-all resize-none"
                  rows="4"
                />
              </div>

              {/* Key Features */}
              <div className="mb-6">
                <div className="flex justify-between items-center mb-3">
                  <label className="block text-sm font-semibold text-slate-200">
                    Key Features
                  </label>
                  <button
                    onClick={addFeature}
                    className="text-cyan-400 hover:text-cyan-300 flex items-center gap-2 text-sm font-medium bg-cyan-400/10 px-3 py-2 rounded-xl transition-all hover:bg-cyan-400/20"
                  >
                    <Plus size={16} /> Add Feature
                  </button>
                </div>
                <div className="space-y-3">
                  {formData.keyFeatures.map((feature, index) => (
                    <div key={index} className="flex gap-3">
                      <input
                        value={feature}
                        onChange={(e) => updateFeature(index, e.target.value)}
                        placeholder={`Feature ${index + 1}`}
                        className="flex-1 p-3 bg-white/5 border border-white/20 backdrop-blur-sm rounded-xl text-white placeholder-slate-400 focus:ring-2 focus:ring-cyan-400/50 focus:border-cyan-400/50 transition-all"
                      />
                      {formData.keyFeatures.length > 1 && (
                        <button
                          onClick={() => removeFeature(index)}
                          className="text-red-400 hover:text-red-300 p-3 bg-red-400/10 hover:bg-red-400/20 rounded-xl transition-all"
                        >
                          <X size={16} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Customer Info */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-slate-200 mb-3">
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
                  placeholder="Who will love this product?"
                  className="w-full p-4 bg-white/5 border border-white/20 backdrop-blur-sm rounded-2xl text-white placeholder-slate-400 focus:ring-2 focus:ring-cyan-400/50 focus:border-cyan-400/50 transition-all"
                />
              </div>

              {/* Style Selection */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-slate-200 mb-3">
                  Video Style
                </label>
                <select
                  value={formData.style}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, style: e.target.value }))
                  }
                  className="w-full p-4 bg-white/5 border border-white/20 backdrop-blur-sm rounded-2xl text-white focus:ring-2 focus:ring-cyan-400/50 focus:border-cyan-400/50 transition-all"
                >
                  <option value="professional" className="bg-slate-800">
                    Professional
                  </option>
                  <option value="casual" className="bg-slate-800">
                    Casual
                  </option>
                  <option value="energetic" className="bg-slate-800">
                    Energetic
                  </option>
                  <option value="minimal" className="bg-slate-800">
                    Minimal
                  </option>
                </select>
              </div>

              {/* Image Upload */}
              <div className="mb-8">
                <label className="block text-sm font-semibold text-slate-200 mb-3">
                  Product Images
                </label>
                <div className="border-2 border-dashed border-white/30 rounded-2xl p-8 text-center hover:border-cyan-400/50 transition-all bg-white/5 backdrop-blur-sm">
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                    id="image-upload"
                  />
                  <label htmlFor="image-upload" className="cursor-pointer">
                    <Upload
                      className="mx-auto mb-3 text-slate-400 hover:text-cyan-400 transition-colors"
                      size={32}
                    />
                    <p className="text-slate-300 font-medium">
                      Click to upload images
                    </p>
                    <p className="text-slate-400 text-sm mt-1">
                      Support JPG, PNG, WebP
                    </p>
                  </label>
                </div>

                {images.length > 0 && (
                  <div className="mt-4 grid grid-cols-3 gap-3">
                    {images.map((img, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={img.url}
                          alt={img.name}
                          className="w-full h-24 object-cover rounded-xl border border-white/20"
                        />
                        <button
                          onClick={() => removeImage(index)}
                          className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                        >
                          <X size={14} />
                        </button>
                        {img.isFromUrl && (
                          <div className="absolute bottom-2 left-2 bg-blue-500 text-white text-xs px-2 py-1 rounded-lg">
                            URL
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="space-y-4">
                <button
                  onClick={generateScript}
                  disabled={
                    isGeneratingScript || !formData.productDescription.trim()
                  }
                  className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 text-white py-4 px-6 rounded-2xl font-semibold hover:from-emerald-400 hover:to-teal-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 transition-all transform hover:scale-105 shadow-xl"
                >
                  {isGeneratingScript ? (
                    <>
                      <Loader2 className="animate-spin" size={22} />
                      Crafting Script...
                    </>
                  ) : (
                    <>
                      <Sparkles size={22} />
                      Generate Script
                    </>
                  )}
                </button>

                <button
                  onClick={generateVideo}
                  disabled={isGenerating || !editedScript}
                  className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-4 px-6 rounded-2xl font-semibold hover:from-purple-500 hover:to-pink-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 transition-all transform hover:scale-105 shadow-xl"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="animate-spin" size={22} />
                      Creating Magic...
                    </>
                  ) : (
                    <>
                      <Video size={22} />
                      Generate Video
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Result Panel */}
            <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl shadow-2xl p-8 hover:bg-white/15 transition-all duration-500">
              <div className="flex items-center gap-3 mb-8">
                <Star className="text-purple-400" size={28} />
                <h2 className="text-3xl font-bold text-white">Your Creation</h2>
              </div>

              {!result && !script && !isGenerating && !isGeneratingScript && (
                <div className="text-center text-slate-400 py-16">
                  <div className="relative mb-6">
                    <Video size={64} className="mx-auto opacity-30" />
                    <div className="absolute inset-0 blur-sm">
                      <Video size={64} className="mx-auto opacity-20" />
                    </div>
                  </div>
                  <p className="text-lg font-medium mb-2">
                    Ready to create something amazing?
                  </p>
                  <p className="text-slate-500">
                    Generate a script first, then watch the magic happen
                  </p>
                </div>
              )}

              {(isGeneratingScript || isGenerating) && (
                <div className="text-center py-16">
                  <div className="relative mb-6">
                    <Loader2
                      className="animate-spin mx-auto text-cyan-400"
                      size={64}
                    />
                    <div className="absolute inset-0 blur-lg">
                      <Loader2
                        className="animate-spin mx-auto text-cyan-400"
                        size={64}
                      />
                    </div>
                  </div>
                  <p className="text-xl text-white font-semibold mb-2">
                    {isGeneratingScript
                      ? "Crafting your perfect script..."
                      : "Bringing your vision to life..."}
                  </p>
                  <p className="text-slate-400">
                    Lumina is working her magic ✨
                  </p>
                </div>
              )}

              {script && !result && (
                <div className="space-y-6">
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="font-bold text-white text-xl">
                        AI-Generated Script
                      </h3>
                      <button
                        onClick={regenerateScript}
                        disabled={isGeneratingScript}
                        className="text-sm bg-gradient-to-r from-yellow-500 to-orange-500 text-white px-4 py-2 rounded-xl hover:from-yellow-400 hover:to-orange-400 disabled:opacity-50 flex items-center gap-2 transition-all transform hover:scale-105"
                      >
                        {isGeneratingScript ? (
                          <Loader2 className="animate-spin" size={14} />
                        ) : (
                          <Sparkles size={14} />
                        )}
                        Regenerate
                      </button>
                    </div>

                    <div className="mb-4">
                      <label className="block text-sm font-semibold text-slate-200 mb-2">
                        Additional Suggestions
                      </label>
                      <textarea
                        value={additionalSuggestions}
                        onChange={(e) =>
                          setAdditionalSuggestions(e.target.value)
                        }
                        placeholder="Tell Lumina how to improve the script..."
                        className="w-full p-3 bg-white/5 border border-white/20 backdrop-blur-sm rounded-xl text-white placeholder-slate-400 focus:ring-2 focus:ring-cyan-400/50 focus:border-cyan-400/50 transition-all resize-none"
                        rows="2"
                      />
                    </div>

                    <div className="bg-black/20 rounded-2xl border border-white/10 overflow-hidden">
                      <div className="bg-white/5 px-4 py-3 border-b border-white/10">
                        <span className="text-sm font-semibold text-slate-200">
                          Script Editor
                        </span>
                      </div>
                      <textarea
                        value={editedScript}
                        onChange={(e) => setEditedScript(e.target.value)}
                        className="w-full p-4 bg-transparent border-none focus:ring-0 focus:outline-none resize-none text-slate-200 font-mono text-sm"
                        rows="14"
                        placeholder="Your script will appear here..."
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
                        <p className="text-sm text-emerald-400 font-medium">
                          Script ready! Edit if needed, then generate video.
                        </p>
                      </div>
                      {editedScript !== script && (
                        <span className="bg-cyan-400/20 text-cyan-300 px-3 py-1 rounded-full text-xs font-medium">
                          Modified
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {result && (
                <div className="space-y-8">
                  <div>
                    <h3 className="font-bold text-white text-xl mb-4">
                      Final Script
                    </h3>
                    <div className="bg-black/20 p-4 rounded-2xl border border-white/10">
                      <pre className="whitespace-pre-wrap text-sm text-slate-200 font-mono">
                        {result.script}
                      </pre>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-bold text-white text-xl mb-4">
                      Your Video is Ready!
                    </h3>
                    <div className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-2xl p-8 text-center border border-purple-400/30">
                      <div className="relative mb-6">
                        <Video size={64} className="mx-auto text-purple-400" />
                        <div className="absolute inset-0 blur-lg">
                          <Video
                            size={64}
                            className="mx-auto text-purple-400"
                          />
                        </div>
                      </div>
                      <p className="text-xl text-white font-semibold mb-4">
                        🎉 Video generated successfully!
                      </p>
                      <p className="text-sm text-slate-300 mb-6 break-all">
                        {result.hosted_url}
                      </p>
                      <button className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-8 py-3 rounded-2xl hover:from-purple-500 hover:to-pink-500 transition-all transform hover:scale-105 font-semibold shadow-xl">
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
    </div>
  );
};

export default VideoGenerator;
