import LoginPage    from '../pages/login/login-page';
import RegisterPage from '../pages/register/register-page';
import HomePage     from '../pages/home/home-page';
import AddStoryPage from '../pages/add-story/add-story-page';
import SavedPage    from '../pages/saved/saved-page';
import NotFoundPage from '../pages/not-found/not-found-page';

const routes = {
  '/':           HomePage,
  '/login':      LoginPage,
  '/register':   RegisterPage,
  '/add':        AddStoryPage,
  '/saved':      SavedPage,
  '/not-found':  NotFoundPage,
};

export default routes;
