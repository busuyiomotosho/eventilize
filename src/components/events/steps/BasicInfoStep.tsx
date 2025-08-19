
// Define a type for the basic event info fields used in this step
export type BasicEventInfo = {
  eventName: string;
  eventLocation: string;
  eventDate: string;
  eventTime: string;
};

interface BasicInfoStepProps {
  eventData: BasicEventInfo;
  updateEventData: (data: Partial<BasicEventInfo>) => void;
}

const BasicInfoStep: React.FC<BasicInfoStepProps> = ({ eventData, updateEventData }) => {
  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h3 className="text-xl font-bold mb-4">Basic Event Information</h3>
      <form> {/* No onSubmit here, handled by parent */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label htmlFor="eventName" className="block text-gray-700 text-sm font-bold mb-2">Event Name</label>
            <input
              type="text"
              id="eventName"
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-blue-500"
              value={eventData.eventName}
              onChange={(e) => updateEventData({ eventName: e.target.value })}
              required
            />
          </div>
          <div>
            <label htmlFor="eventLocation" className="block text-gray-700 text-sm font-bold mb-2">Location</label>
            <input
              type="text"
              id="eventLocation"
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-blue-500"
              value={eventData.eventLocation}
              onChange={(e) => updateEventData({ eventLocation: e.target.value })}
              required
            />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <label htmlFor="eventDate" className="block text-gray-700 text-sm font-bold mb-2">Date</label>
            <input
              type="date"
              id="eventDate"
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-blue-500"
              value={eventData.eventDate}
              onChange={(e) => updateEventData({ eventDate: e.target.value })}
              required
            />
          </div>
          <div>
            <label htmlFor="eventTime" className="block text-gray-700 text-sm font-bold mb-2">Time</label>
            <input
              type="time"
              id="eventTime"
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-blue-500"
              value={eventData.eventTime}
              onChange={(e) => updateEventData({ eventTime: e.target.value })}
              required
            />
          </div>
        </div>
      </form>
    </div>
  );
};

export default BasicInfoStep;