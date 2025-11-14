/**
 * Linear Tool Wrapper
 * Provides typed interface to Linear API via the linear tool
 */

export interface LinearIssue {
  id: string;
  identifier: string;
  title: string;
  description?: string;
  state?: {
    id: string;
    name: string;
    type: string;
  };
  team?: {
    id: string;
    name: string;
  };
  assignee?: {
    id: string;
    name: string;
  };
  priority?: number;
  estimate?: number;
  createdAt: string;
  updatedAt: string;
}

export interface LinearTeam {
  id: string;
  name: string;
  key: string;
}

/**
 * Linear API wrapper using the linear tool
 */
class LinearTool {
  /**
   * Find an issue by identifier (e.g., ONEK-93)
   */
  async findIssue(identifier: string, teamId?: string): Promise<LinearIssue | null> {
    try {
      // Use the linear tool to query for the issue
      const query = `Issue ${identifier} information`;
      const result = await this.query(query);
      
      // Parse the result to extract issue data
      if (result && result.issue) {
        return result.issue as LinearIssue;
      }
      
      return null;
    } catch (error) {
      console.error(`[LinearTool] Error finding issue ${identifier}:`, error);
      return null;
    }
  }

  /**
   * Update issue state
   */
  async updateIssueState(identifier: string, stateName: string, teamId?: string): Promise<boolean> {
    try {
      const query = `Update ${identifier} to the ${stateName} state`;
      await this.mutate(query);
      return true;
    } catch (error) {
      console.error(`[LinearTool] Error updating issue ${identifier}:`, error);
      return false;
    }
  }

  /**
   * Add comment to issue
   */
  async addComment(identifier: string, body: string, teamId?: string): Promise<boolean> {
    try {
      const query = `Comment '${body}' on ticket ${identifier}`;
      await this.mutate(query);
      return true;
    } catch (error) {
      console.error(`[LinearTool] Error adding comment to ${identifier}:`, error);
      return false;
    }
  }

  /**
   * Get team information
   */
  async getTeam(teamKey: string): Promise<LinearTeam | null> {
    try {
      const query = `Team ${teamKey} information`;
      const result = await this.query(query);
      
      if (result && result.team) {
        return result.team as LinearTeam;
      }
      
      return null;
    } catch (error) {
      console.error(`[LinearTool] Error getting team ${teamKey}:`, error);
      return null;
    }
  }

  /**
   * Search issues by query
   */
  async searchIssues(searchQuery: string, teamId?: string): Promise<LinearIssue[]> {
    try {
      const query = teamId 
        ? `Search for issues in team ${teamId} matching: ${searchQuery}`
        : `Search for issues matching: ${searchQuery}`;
      
      const result = await this.query(query);
      
      if (result && result.issues) {
        return result.issues as LinearIssue[];
      }
      
      return [];
    } catch (error) {
      console.error(`[LinearTool] Error searching issues:`, error);
      return [];
    }
  }

  /**
   * Execute a read-only query
   */
  private async query(naturalLanguageQuery: string): Promise<any> {
    // This would use the actual linear tool available in the environment
    // For now, we'll create a placeholder that can be replaced with actual implementation
    console.log(`[LinearTool] Query: ${naturalLanguageQuery}`);
    
    // In actual implementation, this would call the linear tool
    // For example: await linear({ query: naturalLanguageQuery, is_read_only: true })
    
    throw new Error('Linear tool not yet integrated. Please implement using the linear tool from the environment.');
  }

  /**
   * Execute a mutation query
   */
  private async mutate(naturalLanguageQuery: string): Promise<any> {
    console.log(`[LinearTool] Mutate: ${naturalLanguageQuery}`);
    
    // In actual implementation, this would call the linear tool
    // For example: await linear({ query: naturalLanguageQuery, is_read_only: false })
    
    throw new Error('Linear tool not yet integrated. Please implement using the linear tool from the environment.');
  }
}

// Export singleton instance
export const linear = new LinearTool();

