# backend/app.py
from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import List, Optional
import os
import uuid
import requests
import json
from pathlib import Path
from dotenv import load_dotenv


# Load environment variables from .env file
load_dotenv()
app = FastAPI(title="Video Generator API", version="1.0.0")

get_product_details_tool = {
    "type": "function",
    "function": {
        "name": "get_product_details",
        "description": "Retrieve the product details from the url, and key features as well as a few product images to be used",
        "parameters": {
            "properties": {
                "url": {
                    "type": "string",
                    "description": "The url of the product page"
                }
            },
            "required": ["url"]
        }
    }
}

product_details_schema = {
	"schema": {
		"properties": {
			"product_description": {
				"type": "string"
			},
			"key_features": {
				"type": "array",
				"items": {
					"type": "string"
				}
			},
			"target_audience": {
				"type": "string"
			},
			"product_images": {
				"type": "array",
				"items": {
					"type": "string"
				}
			},
			"status": {
				"type": "string"
			}
		},
		"required": [
			"product_description",
			"key_features",
			"status"
		],
		"type": "object"
	}
}
def parse_llama_product_details_response(result):
    """
    Parse LLAMA API response with the new response structure
    """
    try:
        # Check if we have the expected structure
        if 'completion_message' in result:
            completion_message = result['completion_message']
            
            # Check if content exists and has the expected structure
            if 'content' in completion_message and completion_message['content']:
                content = completion_message['content']
                
                # Handle both text type and direct string content
                if isinstance(content, dict) and 'text' in content:
                    text_content = content['text']
                elif isinstance(content, str):
                    text_content = content
                else:
                    text_content = str(content)
                
                # Try to parse the text content as JSON
                try:
                    parsed_data = json.loads(text_content)
                    return parsed_data
                except json.JSONDecodeError:
                    # If not valid JSON, create a basic response with the content
                    return {
                        "product_description": text_content[:500] if text_content else "",
                        "key_features": [],
                        "target_audience": "",
                        "product_images": [],
                        "status": "unknown"
                    }
        
        # Fallback: If the structure doesn't match, return empty response
        return {
            "product_description": "",
            "key_features": [],
            "target_audience": "",
            "product_images": [],
            "status": "error"
        }
        
    except Exception as e:
        print(f"Error parsing LLAMA response: {e}")
        return {
            "product_description": "",
            "key_features": [],
            "target_audience": "",
            "product_images": [],
            "status": "error"
        }



# Alternative simpler version with content cleaning for LLM parsing
def simple_fetch_html(url):
    """Simple version with HTML cleaning to reduce token usage for LLM"""
    try:
        import re
        from bs4 import BeautifulSoup
        
        response = requests.get(url, timeout=10)
        response.raise_for_status()
        
        # Parse HTML with BeautifulSoup
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # Remove unnecessary elements that don't contain useful content
        for element in soup(['script', 'style', 'nav', 'header', 'footer', 
                           'aside', 'iframe', 'noscript', 'form', 'button']):
            element.decompose()
        
        # Remove elements with common non-content classes/ids
        remove_selectors = [
            '[class*="ad"]', '[id*="ad"]', '[class*="banner"]', 
            '[class*="popup"]', '[class*="modal"]', '[class*="cookie"]',
            '[class*="social"]', '[class*="share"]', '[class*="newsletter"]',
            '[class*="sidebar"]', '[class*="menu"]', '[class*="navigation"]'
        ]
        
        for selector in remove_selectors:
            for element in soup.select(selector):
                element.decompose()
        
        # Get clean text content
        clean_text = soup.get_text(separator=' ', strip=True)
        
        # Clean up extra whitespace
        clean_text = re.sub(r'\s+', ' ', clean_text)
        clean_text = re.sub(r'\n\s*\n', '\n', clean_text)
        
        return clean_text.strip()
        
    except ImportError:
        print("BeautifulSoup not installed. Install with: pip install beautifulsoup4")
        return None
    except Exception as e:
        print(f"Error: {e}")
        return None

# CORS middleware for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # React dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Data models
class ScriptGenerationRequest(BaseModel):
    product_description: str
    key_features: List[str]
    customer_info: Optional[str] = None
    style: Optional[str] = "professional"
    additional_suggestions: Optional[str] = None

class ScriptResponse(BaseModel):
    script: str
    status: str

class VideoGenerationRequest(BaseModel):
    script: str
    video_name: Optional[str] = None
    background_url: Optional[str] = ""
    replica_id: Optional[str] = ""

class VideoResponse(BaseModel):
    video_id: str
    video_name: str
    status: str
    hosted_url: Optional[str] = None
    created_at: Optional[str] = None
    script: str

class ProductUrlRequest(BaseModel):
    url: str

class ProductDetailsResponse(BaseModel):
    product_description: str
    key_features: List[str]
    target_audience: Optional[str] = None
    product_images: Optional[List[str]] = None
    status: str

# In-memory storage (replace with database later)
generated_videos = {}

# Services
class LlamaService:
    def __init__(self):
        self.api_key = os.environ.get('LLAMA_API_KEY')
        if not self.api_key:
            raise ValueError("LLAMA_API_KEY environment variable is not set")
        
        self.base_url = "https://api.llama.com/v1"
        self.headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.api_key}"
        }
    
    def extract_product_details(self, url: str) -> dict:
        """Extract product details from a given URL using Llama API with tool calling"""
        html_content = simple_fetch_html(url)
        user_prompt = f"Get the product details from the page {html_content}"
        print(user_prompt)
        payload = {
            "model": "Llama-4-Maverick-17B-128E-Instruct-FP8",
            "messages": [
                {"role": "system", "content": "You are a helpful assistant that extracts product details from a given HTML page"},
                {"role": "user", "content": user_prompt},
            ],
            "response_format": {
                "type": "json_schema",
                "json_schema": product_details_schema,
            }
        }

        try:
            response = requests.post(
                f"{self.base_url}/chat/completions",
                headers=self.headers,
                json=payload
            )
            
            if response.status_code != 200:
                raise HTTPException(status_code=response.status_code, detail=f"LLAMA API error: {response.text}")
            
            result = response.json()
            print(result)
            # Extract the tool call result
            parsed_result = parse_llama_product_details_response(result)
            return parsed_result
            
        except requests.exceptions.RequestException as e:
            raise HTTPException(status_code=500, detail=f"Error connecting to LLAMA API: {str(e)}")
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error extracting product details: {str(e)}")
    
    def generate_script(self, product_description: str, key_features: List[str], customer_info: str = None, style: str = "professional", additional_suggestions: str = None) -> str:
        # Create a detailed prompt for script generation
        features_text = "\n".join(f"- {feature}" for feature in key_features)
        
        system_prompt = """You are an expert marketing video script writer. Create engaging, persuasive video scripts that highlight product benefits and drive customer action. 

Your scripts should:
- Be conversational and engaging 
- Highlight key product benefits
- Include a strong call-to-action
- Be appropriate for a 60-90 second video
- Use the specified style and tone"""

        user_prompt = f"""You are a knowledgeable and enthusiastic product expert. Create a conversational and engaging talking points script for a marketing video about the following product:

Product Description: {product_description}

Key Features:
{features_text}

Target Audience: {customer_info or "General consumers"}

Style: {style}

{f"Additional Requirements: {additional_suggestions}" if additional_suggestions else ""}

Please generate a 60 second talking points conversation scripts that highlights the key benefits and features of the product. Use a friendly and approachable tone, and make sure the script is easy to follow and understand. Focus on the most important information and avoid using overly technical or promotional language.

The script should be written in a natural, conversational style, as if you were talking directly to the target audience. You can use storytelling techniques, examples, or anecdotes to make the product more relatable and interesting.

Please output a script that is concise, clear, and engaging, and that effectively communicates the value of the product to the target audience.
Please do not include any time stamp in the script, introduction or things about the script, just the actual talking points.
"""

        payload = {
            "model": "Llama-4-Maverick-17B-128E-Instruct-FP8",
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            "stream": True
        }

        try:
            # Send the request
            response = requests.post(
                f"{self.base_url}/chat/completions", 
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {self.api_key}",
                    "Accept": "text/event-stream"
                }, 
                json=payload,
                stream=True
            )
            
            if response.status_code != 200:
                raise HTTPException(status_code=response.status_code, detail=f"LLAMA API error: {response.text}")
            
            # Collect and process the full response
            full_response = ""
            for chunk in response.iter_lines():
                if chunk:
                    try:
                        # Decode the chunk and parse JSON
                        # The first 6 characters are "data: ", so we skip them
                        decoded_chunk = chunk.decode("utf-8")[6:]
                        data = json.loads(decoded_chunk)
                        
                        if "event" in data:
                            if data["event"]["event_type"] == "progress":
                                token = data["event"]["delta"]["text"]
                                full_response += token
                            elif data["event"]["event_type"] == "complete":
                                break
                    except json.JSONDecodeError:
                        # Skip malformed JSON chunks
                        continue
            
            if not full_response.strip():
                raise HTTPException(status_code=500, detail="No response received from LLAMA API")
            
            return full_response.strip()
            
        except requests.exceptions.RequestException as e:
            raise HTTPException(status_code=500, detail=f"Error connecting to LLAMA API: {str(e)}")
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error generating script: {str(e)}")

class VideoGenerationService:
    def __init__(self):
        self.tavus_api_key = os.environ.get('TAVUS_API_KEY')
        if not self.tavus_api_key:
            raise ValueError("TAVUS_API_KEY environment variable is not set")
        
        self.tavus_url = "https://tavusapi.com/v2/videos"
        self.headers = {
            "x-api-key": self.tavus_api_key,
            "Content-Type": "application/json"
        }
    
    def create_video(self, script: str, video_name="new video", background_url: str = "", replica_id: str = "") -> dict:
        """
        Create a video using Tavus API  
        
        Args:
            script: The video script
            video_name: Name for the video (optional, will generate if not provided)
            background_url: Background URL for the video
            replica_id: Replica ID to use for the video
            
        Returns:
            dict: Tavus API response containing video_id, status, etc.
        """
        if not video_name:
            video_name = f"Generated_Video_{uuid.uuid4().hex[:8]}"
        
        print("in create video")
        payload = {
            "background_url": '',
            "replica_id": 'rca8a38779a8',
            "script": script,
            "video_name": video_name
        }
        
        try:
            response = requests.post(
                self.tavus_url,
                json=payload,
                headers=self.headers
            )
            print(response.json())
            if response.status_code != 200:
                raise HTTPException(
                    status_code=response.status_code, 
                    detail=f"Tavus API error: {response.text}"
                )
            
            return response.json()
            
        except requests.exceptions.RequestException as e:
            raise HTTPException(status_code=500, detail=f"Error connecting to Tavus API: {str(e)}")
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error generating video: {str(e)}")

# Initialize services
try:
    llama_service = LlamaService()
except ValueError as e:
    print(f"Warning: {e}")
    llama_service = None

try:
    video_service = VideoGenerationService()
except ValueError as e:
    print(f"Warning: {e}")
    video_service = None

# Routes
@app.get("/")
async def root():
    return {"message": "Video Generator API is running!"}

@app.post("/api/extract-product-details", response_model=ProductDetailsResponse)
async def extract_product_details(request: ProductUrlRequest):
    if not llama_service:
        raise HTTPException(status_code=500, detail="LLAMA API service not available. Please check LLAMA_API_KEY environment variable.")
    
    try:
        # Extract product details using Llama service
        details = llama_service.extract_product_details(request.url)
        
        return ProductDetailsResponse(
            product_description=details.get("product_description", ""),
            key_features=details.get("key_features", []),
            target_audience=details.get("target_audience", ""),
            product_images=details.get("product_images", []),
            status="completed"
        )
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Unexpected error: {str(e)}")

@app.post("/api/upload-images")
async def upload_images(files: List[UploadFile] = File(...)):
    uploaded_files = []
    upload_dir = Path("uploads")
    upload_dir.mkdir(exist_ok=True)
    
    for file in files:
        if not file.content_type.startswith("image/"):
            raise HTTPException(status_code=400, detail=f"File {file.filename} is not an image")
        
        file_id = str(uuid.uuid4())
        file_path = upload_dir / f"{file_id}_{file.filename}"
        
        with open(file_path, "wb") as buffer:
            content = await file.read()
            buffer.write(content)
        
        uploaded_files.append({
            "id": file_id,
            "filename": file.filename,
            "path": str(file_path)
        })
    
    return {"uploaded_files": uploaded_files}

@app.post("/api/generate-script", response_model=ScriptResponse)
async def generate_script(request: ScriptGenerationRequest):
    if not llama_service:
        raise HTTPException(status_code=500, detail="LLAMA API service not available. Please check LLAMA_API_KEY environment variable.")
    
    try:
        # Generate script using Llama service
        script = llama_service.generate_script(
            request.product_description,
            request.key_features,
            request.customer_info,
            request.style,
            request.additional_suggestions
        )
        
        return ScriptResponse(
            script=script,
            status="completed"
        )
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Unexpected error: {str(e)}")

@app.post("/api/generate-video", response_model=VideoResponse)
async def generate_video(request: VideoGenerationRequest):
    if not video_service:
        raise HTTPException(status_code=500, detail="Tavus API service not available. Please check TAVUS_API_KEY environment variable.")
    
    try:
        print(request.script)
        # Generate video using Tavus API
        tavus_response = video_service.create_video(
            script=request.script,
            video_name=request.video_name or "new video",
            background_url=request.background_url or "",
            replica_id=request.replica_id or ""
        )
        print(tavus_response)
        # Store the result with Tavus response data
        video_id = tavus_response.get("video_id")
        generated_videos[video_id] = {
            "script": request.script,
            "video_id": video_id,
            "video_name": tavus_response.get("video_name"),
            "status": tavus_response.get("status"),
            "hosted_url": tavus_response.get("hosted_url"),
            "created_at": tavus_response.get("created_at")
        }
        
        return VideoResponse(
            video_id=video_id,
            video_name=tavus_response.get("video_name"),
            status=tavus_response.get("status"),
            hosted_url=tavus_response.get("hosted_url"),
            created_at=tavus_response.get("created_at"),
            script=request.script
        )
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Unexpected error: {str(e)}")

@app.get("/api/videos/{video_id}")
async def get_video_status(video_id: str):
    if video_id not in generated_videos:
        raise HTTPException(status_code=404, detail="Video not found")
    
    return generated_videos[video_id]

if __name__ == "__main__":
    import uvicorn
    print("Starting server...")
    print(f"Current directory: {os.getcwd()}")
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)