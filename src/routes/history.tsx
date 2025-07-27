// src/routes/history.tsx
import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { getHistory, removeHistory } from "../utils/storage";
import type { HistoryItem } from "../types";
import { useContext } from "react";
import { HistoryNavigationContext } from "../App";

export default function History() {
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [selectedFilter, setSelectedFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("newest");
  const [displayedItems, setDisplayedItems] = useState<HistoryItem[]>([]);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
  const navigate = useNavigate();
  const nav = useContext(HistoryNavigationContext);

  const ITEMS_PER_PAGE = 15;

  // Use navigation context history instead of loading separately
  const items = nav?.history || [];
  const isLoading = !nav?.initialized;

  // Filter and sort items
  const filteredAndSortedItems = useMemo(() => {
    let filtered = items;

    // Apply search filter
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(item =>
        item.title.toLowerCase().includes(searchLower) ||
        item.response.toLowerCase().includes(searchLower) ||
        (item.tags && item.tags.some(tag => tag.toLowerCase().includes(searchLower))) ||
        (item.suggestedQuestions && item.suggestedQuestions.some(q => q.toLowerCase().includes(searchLower)))
      );
    }

    // Apply type filter
    if (selectedFilter !== "all") {
      filtered = filtered.filter(item => {
        if (selectedFilter === "summaries") {
          return item.type === 'summary';
        } else if (selectedFilter === "searches") {
          return item.type === 'search';
        } else if (selectedFilter === "questions") {
          return item.type === 'question';
        }
        return true;
      });
    }

    // Apply sorting
    filtered.sort((a, b) => {
      if (sortBy === "newest") {
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      } else if (sortBy === "oldest") {
        return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
      } else if (sortBy === "title") {
        return a.title.localeCompare(b.title);
      }
      return 0;
    });

    return filtered;
  }, [items, searchTerm, selectedFilter, sortBy]);

  // Update displayed items when filters change
  useEffect(() => {
    setCurrentPage(1);
    const startIndex = 0;
    const endIndex = ITEMS_PER_PAGE;
    setDisplayedItems(filteredAndSortedItems.slice(startIndex, endIndex));
    setHasMore(filteredAndSortedItems.length > ITEMS_PER_PAGE);
  }, [filteredAndSortedItems]);

  const loadMoreItems = useCallback(() => {
    if (isLoadingMore || !hasMore) return;

    setIsLoadingMore(true);
    
    // Simulate a small delay for better UX
    setTimeout(() => {
      const nextPage = currentPage + 1;
      const startIndex = 0;
      const endIndex = nextPage * ITEMS_PER_PAGE;
      const newItems = filteredAndSortedItems.slice(startIndex, endIndex);
      
      setDisplayedItems(newItems);
      setCurrentPage(nextPage);
      setHasMore(filteredAndSortedItems.length > endIndex);
      setIsLoadingMore(false);
    }, 300);
  }, [currentPage, filteredAndSortedItems, hasMore, isLoadingMore]);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await removeHistory(id);
      // The navigation context will automatically update when storage changes
    } catch (error) {
      console.error("Failed to delete history item:", error);
    }
  };

  const handleExport = () => {
    const exportData = {
      exportDate: new Date().toISOString(),
      totalItems: items.length,
      items: items
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `orla-history-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getItemType = (item: HistoryItem): string => {
    return item.type;
  };

  const getItemIcon = (item: HistoryItem): string => {
    switch (item.type) {
      case "search": return "fas fa-search";
      case "question": return "fas fa-question-circle";
      case "summary": return "fas fa-file-alt";
      default: return "fas fa-file-alt";
    }
  };

  const formatDate = (timestamp: string): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 1) return "Just now";
    if (diffInHours < 24) return `${Math.floor(diffInHours)}h ago`;
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d ago`;
    return date.toLocaleDateString();
  };

  const truncateText = (text: string, maxLength: number = 100): string => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + "...";
  };

  return (
    <div className="history-page">
      {/* Header */}
      <div className="history-header">
        <div className="history-header-left">
          <h2>History <span className="history-count">
            {displayedItems.length} of {filteredAndSortedItems.length} items
          </span></h2>
        </div>
        <div className="history-header-right">
          <button
            className="history-action-btn"
            onClick={handleExport}
            title="Export History as JSON"
          >
            <i className="fas fa-download"></i>
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="history-controls">
        <div className="search-container">
          <i className="fas fa-search search-icon"></i>
          <input
            type="text"
            placeholder="Search history..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="history-search-input"
          />
          {searchTerm && (
            <button
              className="clear-search-btn"
              onClick={() => setSearchTerm("")}
              title="Clear search"
            >
              <i className="fas fa-times"></i>
            </button>
          )}
        </div>
        
        <div className="filter-controls">
          <select
            value={selectedFilter}
            onChange={e => setSelectedFilter(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Types</option>
            <option value="summaries">Summaries</option>
            <option value="searches">Searches</option>
            <option value="questions">Questions</option>
          </select>
          
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value)}
            className="sort-select"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="title">Alphabetical</option>
          </select>
        </div>
      </div>

      {/* History List */}
      <div className="history-content">
        {isLoading ? (
          <div className="loading-container">
            <i className="fas fa-spinner fa-spin"></i>
            <span>Loading history...</span>
          </div>
        ) : displayedItems.length === 0 ? (
          <div className="empty-state">
            <i className="fas fa-history"></i>
            <h3>No history found</h3>
            <p>
              {searchTerm || selectedFilter !== "all" 
                ? "Try adjusting your search or filters"
                : "Your conversation history will appear here"
              }
            </p>
          </div>
        ) : (
          <div className="history-list">
            {displayedItems.map((item, idx) => (
              <div
                key={item.id}
                className={`history-item history-item-${getItemType(item)}`}
                onClick={() => {
                  if (nav) {
                    const index = nav.history.findIndex(h => h.id === item.id);
                    console.log('History click: nav.history', nav.history);
                    console.log('History click: item.id', item.id, 'index', index);
                    if (index >= 0) {
                      nav.setIndex(index);
                      navigate("/");
                    }
                  }
                }}
              >
                <div className="history-item-header">
                  <div className="history-item-icon">
                    <i className={getItemIcon(item)}></i>
                  </div>
                  <div className="history-item-content">
                    <h3 className="history-item-title">{item.title}</h3>
                    <p className="history-item-preview">
                      {truncateText(item.response.replace(/<[^>]*>/g, ""))}
                    </p>
                    <div className="history-item-meta">
                      <span className="history-item-time">{formatDate(item.timestamp)}</span>
                    </div>
                  </div>
                  <button
                    className="history-delete-btn"
                    onClick={(e) => handleDelete(item.id, e)}
                    title="Delete"
                  >
                    <i className="fas fa-trash"></i>
                  </button>
                </div>
              </div>
            ))}
            
            {/* Load More Button */}
            {hasMore && (
              <div className="load-more-container">
                <button
                  className="load-more-btn"
                  onClick={loadMoreItems}
                  disabled={isLoadingMore}
                >
                  {isLoadingMore ? (
                    <>
                      <i className="fas fa-spinner fa-spin"></i>
                      Loading...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-chevron-down"></i>
                      Load More ({filteredAndSortedItems.length - displayedItems.length} remaining)
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}