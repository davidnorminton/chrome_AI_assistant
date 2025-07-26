import React from 'react';

interface LinkItem {
  title: string;
  url: string;
  description: string;
}

interface LinkListProps {
  links: LinkItem[];
  searchQuery: string;
  shouldShow: boolean;
}

export default function LinkList({ links, searchQuery, shouldShow }: LinkListProps) {
  if (!shouldShow) return null;

  return (
    <div>
      <h3 className="search-results-title">
        Showing results for "{searchQuery}"
      </h3>
      <ul className="link-list">
        {links.map((link) => (
          <li key={link.url}>
            <a
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
            >
              {link.title}
            </a>
            {link.description && <p>{link.description}</p>}
          </li>
        ))}
      </ul>
    </div>
  );
} 