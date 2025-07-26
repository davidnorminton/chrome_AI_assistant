import React from 'react';

interface ImageItem {
  title: string;
  url: string;
  description: string;
  imageUrl: string;
  base64Data?: string;
}

interface ImageListProps {
  images: ImageItem[];
  searchQuery: string;
  shouldShow: boolean;
}

export default function ImageList({ images, searchQuery, shouldShow }: ImageListProps) {
  if (!shouldShow || images.length === 0) {
    return null;
  }

  const handleImageClick = (url: string) => {
    window.open(url, '_blank');
  };

  return (
    <div className="image-list-container">
      <div className="search-results-title">
        Image search results for "{searchQuery}"
      </div>
      <div className="image-grid">
        {images.map((image, index) => (
          <div key={index} className="image-item" onClick={() => handleImageClick(image.url)}>
            <div className="image-thumbnail">
              <img 
                src={image.base64Data || image.imageUrl} 
                alt={image.title}
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  target.nextElementSibling?.classList.add('show');
                }}
              />
              <div className="image-fallback">
                <i className="fas fa-image"></i>
              </div>
            </div>
            <div className="image-info">
              <div className="image-title">{image.title}</div>
              <div className="image-description">{image.description}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 