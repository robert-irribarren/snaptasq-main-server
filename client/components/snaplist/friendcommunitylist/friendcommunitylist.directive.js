angular.module('snaptasqApp').directive('friendcommunitylist', function($parse, $location, Community) {
    return {
        restrict: 'ACE',
        // Replace the div with our template
        replace: false,
        scope: {
            id: "=friendcommunitylist",
            searchFilter: "=filter",
            listTitle: "=listTitle"
        },
        templateUrl: 'components/snaplist/friendcommunitylist/friendcommunitylist.template.html',
        controller: function($scope) {
            $scope.items = [];
            console.log($scope.id);
            Community.getUserCommunties($scope.id, function(data) {
                $scope.items = data;
            });
            $scope._goToPath = function(url, $event) {
                if (!angular.isUndefined($event)) {
                    $event.stopPropagation();
                }
                $location.path(url);
            }
        },
        link: function($scope, $element, $attributes) {
            $scope.options = $scope.$eval($attributes.options);
        }
    }
});
