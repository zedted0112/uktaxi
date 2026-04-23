import { useAuth } from '../../src/auth';
import NotificationsScreen from '../../src/components/NotificationsScreen';

export default function DriverNotifications() {
  const { user } = useAuth();
  return <NotificationsScreen phone={user?.phone ?? ''} />;
}
