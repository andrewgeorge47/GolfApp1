import React, { useState, useEffect } from 'react';
import { getClubMembers } from '../services/api';
import { Search, X } from 'lucide-react';
import { Badge } from './ui/Badge';

interface Member {
  member_id: number;
  first_name: string;
  last_name: string;
  club: string;
}

interface MemberMultiSelectProps {
  selectedMembers: number[]; // Array of member_ids
  onChange: (memberIds: number[]) => void;
  userClub?: string; // User's club for filtering
  restrictToClub?: boolean; // If true, only show members from userClub
  maxSelections?: number; // Maximum number of selections allowed
  required?: boolean;
}

export const MemberMultiSelect: React.FC<MemberMultiSelectProps> = ({
  selectedMembers,
  onChange,
  userClub,
  restrictToClub = true,
  maxSelections,
  required = false,
}) => {
  const [members, setMembers] = useState<Member[]>([]);
  const [filteredMembers, setFilteredMembers] = useState<Member[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    fetchMembers();
  }, [userClub, restrictToClub]);

  useEffect(() => {
    // Filter members based on search term
    const filtered = members.filter(member => {
      const fullName = `${member.first_name} ${member.last_name}`.toLowerCase();
      return fullName.includes(searchTerm.toLowerCase());
    });
    setFilteredMembers(filtered);
  }, [searchTerm, members]);

  const fetchMembers = async () => {
    try {
      setLoading(true);
      const club = restrictToClub ? userClub : undefined;
      const response = await getClubMembers(club);
      setMembers(response.data);
      setFilteredMembers(response.data);
    } catch (error) {
      console.error('Error fetching members:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMemberToggle = (memberId: number) => {
    if (selectedMembers.includes(memberId)) {
      // Remove member
      onChange(selectedMembers.filter(id => id !== memberId));
    } else {
      // Add member
      if (maxSelections && selectedMembers.length >= maxSelections) {
        return; // Don't allow more selections
      }
      onChange([...selectedMembers, memberId]);
    }
  };

  const handleRemoveMember = (memberId: number) => {
    onChange(selectedMembers.filter(id => id !== memberId));
  };

  const getSelectedMembersData = () => {
    return members.filter(member => selectedMembers.includes(member.member_id));
  };

  const isMaxReached = maxSelections ? selectedMembers.length >= maxSelections : false;

  return (
    <div className="space-y-2">
      {/* Selected Members Display */}
      {selectedMembers.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {getSelectedMembersData().map(member => (
            <Badge key={member.member_id} variant="success" className="flex items-center gap-1">
              {member.first_name} {member.last_name}
              <button
                type="button"
                onClick={() => handleRemoveMember(member.member_id)}
                className="ml-1 hover:text-red-600"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {/* Search Input */}
      <div className="relative">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setShowDropdown(true);
            }}
            onFocus={() => setShowDropdown(true)}
            placeholder={
              isMaxReached
                ? `Maximum ${maxSelections} selections reached`
                : `Search ${restrictToClub && userClub ? `${userClub} members` : 'members'}...`
            }
            disabled={isMaxReached}
            className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-neon-green disabled:bg-gray-100 disabled:cursor-not-allowed"
          />
        </div>

        {/* Dropdown */}
        {showDropdown && !isMaxReached && (
          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center text-gray-500">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-brand-neon-green mx-auto"></div>
              </div>
            ) : filteredMembers.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                {searchTerm ? `No members found matching "${searchTerm}"` : 'No members available'}
              </div>
            ) : (
              filteredMembers.map(member => {
                const isSelected = selectedMembers.includes(member.member_id);
                return (
                  <button
                    key={member.member_id}
                    type="button"
                    onClick={() => handleMemberToggle(member.member_id)}
                    className={`w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center justify-between ${
                      isSelected ? 'bg-green-50' : ''
                    }`}
                  >
                    <div>
                      <div className="font-medium text-gray-900">
                        {member.first_name} {member.last_name}
                      </div>
                      <div className="text-sm text-gray-500">{member.club}</div>
                    </div>
                    {isSelected && (
                      <Badge variant="success" className="text-xs">
                        Selected
                      </Badge>
                    )}
                  </button>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* Helper Text */}
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>
          {selectedMembers.length} {selectedMembers.length === 1 ? 'member' : 'members'} selected
          {maxSelections && ` (max ${maxSelections})`}
        </span>
        {showDropdown && (
          <button
            type="button"
            onClick={() => setShowDropdown(false)}
            className="text-brand-dark-green hover:underline"
          >
            Close
          </button>
        )}
      </div>

      {required && selectedMembers.length === 0 && (
        <p className="text-sm text-red-600">At least one member must be selected</p>
      )}
    </div>
  );
};

export default MemberMultiSelect;
